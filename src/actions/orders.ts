"use server";

import { FulfillmentMethod, ListingStatus, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { calculateFees, getPlatformSettings } from "@/lib/fees";
import { connectedAccountCreateParams, getStripe, stripeConfigured } from "@/lib/stripe";
import { orderNumber } from "@/lib/slug";
import { absoluteUrl, formatDateLabel, isDailyRentalListing, isHousingRentalSlug, toNoonUtc, validateRentalPeriod } from "@/lib/utils";
import { notify } from "@/lib/notifications";
import { fulfillMarketplaceOrder } from "@/lib/fulfill-order";
import { assertRentalDatesFree, getBookedRentalRanges } from "@/lib/rental-availability";
import { revalidatePath } from "next/cache";

async function currentUser() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Please sign in to checkout.");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.isSuspended) throw new Error("This account cannot checkout.");
  return user;
}

export async function sellerCanReceivePayouts(sellerId: string) {
  const account = await prisma.stripeAccount.findUnique({ where: { userId: sellerId } });
  return account?.status === "PAYOUTS_ENABLED" && account.payoutsEnabled;
}

export async function createCheckoutSession(
  listingId: string,
  fulfillment: FulfillmentMethod,
  rentalPeriod?: { startDate: string; endDate: string } | null,
) {
  const buyer = await currentUser();
  if (!stripeConfigured()) throw new Error("Payments are not configured yet.");
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { seller: { include: { stripeAccount: true } }, city: true, category: true },
  });
  if (!listing || listing.status !== ListingStatus.ACTIVE) throw new Error("This listing is no longer available.");
  if (listing.sellerId === buyer.id) throw new Error("You cannot buy your own listing.");
  if (!["FOR_SALE", "RENTAL"].includes(listing.listingType) || listing.priceCents <= 0) {
    throw new Error("This listing does not require online payment.");
  }
  const connect = listing.seller.stripeAccount;
  if (!connect || connect.status !== "PAYOUTS_ENABLED" || !connect.payoutsEnabled) {
    throw new Error("This seller has not finished Stripe onboarding, so marketplace payments are not enabled yet.");
  }

  const housingRental = isHousingRentalSlug(listing.category.slug);
  const dailyRental = isDailyRentalListing(listing.listingType, listing.category.slug);
  let rentalDays = 0;
  let rentalStart: Date | null = null;
  let rentalEnd: Date | null = null;
  if (dailyRental) {
    const period = validateRentalPeriod(rentalPeriod?.startDate || "", rentalPeriod?.endDate || "");
    if (!period.ok) throw new Error(period.error);
    rentalDays = period.days;
    rentalStart = toNoonUtc(rentalPeriod!.startDate);
    rentalEnd = toNoonUtc(rentalPeriod!.endDate);
  }

  const itemPriceCents = dailyRental ? listing.priceCents * rentalDays : listing.priceCents;
  const deliveryFeeCents =
    !housingRental && fulfillment === "LOCAL_DELIVERY" && listing.fulfillment === "LOCAL_DELIVERY" && !listing.freeDelivery
      ? listing.deliveryFeeCents
      : 0;
  if (!housingRental && fulfillment === "LOCAL_DELIVERY" && listing.fulfillment !== "LOCAL_DELIVERY") {
    throw new Error("This seller offers pickup only.");
  }

  const settings = await getPlatformSettings();
  const fees = calculateFees({
    itemPriceCents,
    deliveryFeeCents,
    commissionPercent: settings.commissionPercent,
    commissionOnDelivery: settings.commissionOnDelivery,
    stripeFeeTreatment: settings.stripeFeeTreatment,
    deliveryFeeGoesTo: settings.deliveryFeeGoesTo,
  });

  // Replace abandoned checkouts for this buyer + listing so they don't pile up.
  await prisma.order.updateMany({
    where: {
      buyerId: buyer.id,
      status: OrderStatus.PAYMENT_PENDING,
      items: { some: { listingId: listing.id } },
    },
    data: { status: OrderStatus.CANCELLED, cancelledAt: new Date(), cancelReason: "Replaced by new checkout" },
  });

  if (dailyRental && rentalPeriod) {
    const booked = await getBookedRentalRanges(listing.id);
    assertRentalDatesFree(rentalPeriod.startDate, rentalPeriod.endDate, booked);
  }

  const order = await prisma.order.create({
    data: {
      orderNumber: orderNumber(),
      status: OrderStatus.PAYMENT_PENDING,
      buyerId: buyer.id,
      sellerId: listing.sellerId,
      itemPriceCents: fees.itemPriceCents,
      deliveryFeeCents: fees.deliveryFeeCents,
      totalCents: fees.totalCents,
      platformFeeCents: fees.platformFeeCents,
      sellerPayoutCents: fees.sellerPayoutCents,
      fulfillment,
      rentalStartDate: rentalStart,
      rentalEndDate: rentalEnd,
      rentalDays: dailyRental ? rentalDays : null,
      dailyRateCents: dailyRental ? listing.priceCents : null,
      items: {
        create: {
          listingId: listing.id,
          title: listing.title,
          priceCents: itemPriceCents,
        },
      },
      ledgerEntries: {
        create: {
          buyerId: buyer.id,
          sellerId: listing.sellerId,
          listingId: listing.id,
          itemPriceCents: fees.itemPriceCents,
          deliveryFeeCents: fees.deliveryFeeCents,
          platformCommissionCents: fees.platformFeeCents,
          stripeConnectAccountId: connect.stripeAccountId,
          sellerPayoutCents: fees.sellerPayoutCents,
          status: "PAYMENT_PENDING",
          type: "MARKETPLACE_SALE",
        },
      },
    },
  });

  const productName = housingRental
    ? `${listing.title} — first month’s rent`
    : dailyRental
      ? `${listing.title} — ${rentalDays}-day rental (${formatDateLabel(rentalPeriod!.startDate)} to ${formatDateLabel(rentalPeriod!.endDate)})`
      : listing.title;

  // Direct charge on the connected account (Stripe-Account header).
  // Stripe bills payment-processing fees to the seller; platform takes application_fee only.
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer_email: buyer.email,
      line_items: [
        {
          quantity: dailyRental ? rentalDays : 1,
          price_data: {
            currency: "usd",
            unit_amount: listing.priceCents,
            product_data: { name: productName },
          },
        },
        ...(deliveryFeeCents
          ? [
              {
                quantity: 1,
                price_data: {
                  currency: "usd",
                  unit_amount: deliveryFeeCents,
                  product_data: { name: "Local delivery" },
                },
              },
            ]
          : []),
      ],
      payment_intent_data: {
        application_fee_amount: fees.platformFeeCents,
        metadata: { orderId: order.id, type: "marketplace_sale" },
      },
      metadata: { orderId: order.id, type: "marketplace_sale" },
      success_url: absoluteUrl(`/orders/${order.id}?paid=1`),
      cancel_url: absoluteUrl(`/listing/${listing.slug}?checkout=cancelled`),
    },
    { stripeAccount: connect.stripeAccountId },
  );

  await prisma.order.update({
    where: { id: order.id },
    data: { stripeCheckoutSessionId: session.id },
  });

  return session.url;
}

/**
 * After Checkout success, verify the session with Stripe and mark the order paid.
 * Needed because marketplace sales are direct charges on connected accounts — the
 * Connect webhook can be delayed or misconfigured, leaving the order stuck on Pending.
 */
export async function confirmOrderPayment(orderId: string) {
  const user = await currentUser();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { seller: { include: { stripeAccount: true } } },
  });
  if (!order) return { ok: false as const, error: "Order not found." };
  if (order.buyerId !== user.id && order.sellerId !== user.id && user.role !== "ADMIN") {
    return { ok: false as const, error: "Not allowed." };
  }
  if (order.status !== OrderStatus.PAYMENT_PENDING) {
    return { ok: true as const, status: order.status };
  }
  if (!order.stripeCheckoutSessionId) {
    return { ok: false as const, error: "No Stripe checkout session on this order." };
  }
  const connectId = order.seller.stripeAccount?.stripeAccountId;
  if (!connectId) {
    return { ok: false as const, error: "Seller Stripe account is missing." };
  }
  if (!stripeConfigured()) {
    return { ok: false as const, error: "Stripe is not configured." };
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(
      order.stripeCheckoutSessionId,
      {},
      { stripeAccount: connectId },
    );
    if (session.payment_status !== "paid" && session.status !== "complete") {
      return { ok: false as const, error: "Stripe has not marked this payment as paid yet. Try again in a moment." };
    }
    await fulfillMarketplaceOrder(session);
    revalidatePath(`/orders/${order.id}`);
    return { ok: true as const, status: "PAID" as const };
  } catch (err) {
    console.error("[confirmOrderPayment]", err);
    const message = err instanceof Error ? err.message : "Could not confirm payment.";
    return { ok: false as const, error: message.length < 180 ? message : "Could not confirm payment with Stripe." };
  }
}

export async function connectStripeAccount(opts?: { returnPath?: string; refreshPath?: string }) {
  try {
    const user = await currentUser();
    if (!stripeConfigured()) {
      return { error: "Stripe is not configured on the server. Add STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, then restart." };
    }
    const stripe = getStripe();
    let record = await prisma.stripeAccount.findUnique({ where: { userId: user.id } });
    if (!record) {
      // Standard-type connected account (full dashboard; seller pays Stripe fees; no Express MAA fee).
      const account = await stripe.accounts.create(
        connectedAccountCreateParams({ email: user.email, userId: user.id }),
      );
      record = await prisma.stripeAccount.create({
        data: {
          userId: user.id,
          stripeAccountId: account.id,
          status: "SETUP_INCOMPLETE",
        },
      });
    }
    const returnPath = opts?.returnPath || "/dashboard/stripe?return=1";
    const refreshPath = opts?.refreshPath || "/dashboard/stripe?refresh=1";
    const link = await stripe.accountLinks.create({
      account: record.stripeAccountId,
      refresh_url: absoluteUrl(refreshPath),
      return_url: absoluteUrl(returnPath),
      type: "account_onboarding",
    });
    if (!link.url) return { error: "Stripe did not return an onboarding link. Please try again." };
    return { url: link.url };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not connect Stripe.";
    console.error("[connectStripeAccount]", err);
    return {
      error:
        message.length < 200 && !/Server Components|digest/i.test(message)
          ? message
          : "Could not start Stripe onboarding. Check Stripe keys and APP_URL, then try again from Dashboard → Manage Stripe.",
    };
  }
}

export async function refreshStripeStatus() {
  const user = await currentUser();
  const record = await prisma.stripeAccount.findUnique({ where: { userId: user.id } });
  if (!record || !stripeConfigured()) return record;
  
  try {
    const account = await getStripe().accounts.retrieve(record.stripeAccountId);
    const status = account.payouts_enabled
      ? "PAYOUTS_ENABLED"
      : account.details_submitted
        ? "CONNECTED"
        : "SETUP_INCOMPLETE";
    return prisma.stripeAccount.update({
      where: { id: record.id },
      data: {
        detailsSubmitted: Boolean(account.details_submitted),
        chargesEnabled: Boolean(account.charges_enabled),
        payoutsEnabled: Boolean(account.payouts_enabled),
        status,
      },
    });
  } catch (err) {
    console.error("Stripe account retrieval failed:", err);
    const stripeError = err as { code?: string; statusCode?: number; message?: string } | undefined;

    if (stripeError?.code === "account_invalid" || stripeError?.statusCode === 404) {
      console.log("Deleting invalid Stripe account record:", record.stripeAccountId);
      await prisma.stripeAccount.delete({ where: { id: record.id } });
      throw new Error("Your Stripe account configuration was outdated and has been removed. Please reconnect your Stripe account.");
    }

    throw new Error(`Failed to refresh Stripe status: ${stripeError?.message || "Unknown error"}`);
  }
}

export async function openStripeDashboard() {
  try {
    const user = await currentUser();
    const record = await prisma.stripeAccount.findUnique({ where: { userId: user.id } });
    if (!record) return { error: "Connect Stripe first." };
    try {
      // Login links only work for Express-dashboard accounts (legacy).
      const link = await getStripe().accounts.createLoginLink(record.stripeAccountId);
      return { url: link.url };
    } catch {
      // Standard-type accounts sign in to the full Stripe Dashboard directly.
      return { url: "https://dashboard.stripe.com" };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not open Stripe.";
    return { error: message.length < 180 ? message : "Could not open Stripe Dashboard." };
  }
}

export async function deleteStripeAccount() {
  const user = await currentUser();
  const record = await prisma.stripeAccount.findUnique({ where: { userId: user.id } });
  if (!record) throw new Error("No Stripe account found.");
  
  try {
    await getStripe().accounts.del(record.stripeAccountId);
  } catch (err) {
    console.warn("Could not delete Stripe account (may already be deleted):", err);
  }
  
  await prisma.stripeAccount.delete({ where: { id: record.id } });
  return true;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const user = await currentUser();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { listing: { include: { category: { select: { slug: true } } } } } } },
  });
  if (!order) throw new Error("Order not found.");
  const isSeller = order.sellerId === user.id;
  const isBuyer = order.buyerId === user.id;
  const isAdmin = user.role === "ADMIN";
  if (!isSeller && !isBuyer && !isAdmin) throw new Error("Not allowed.");

  const data: Record<string, unknown> = { status };
  if (status === "SELLER_CONFIRMED") data.sellerConfirmedAt = new Date();
  if (status === "COMPLETED") data.completedAt = new Date();
  if (status === "CANCELLED") data.cancelledAt = new Date();
  await prisma.order.update({ where: { id: orderId }, data });

  if (status === "COMPLETED") {
    for (const item of order.items) {
      if (isDailyRentalListing(item.listing.listingType, item.listing.category.slug)) continue;
      await prisma.listing.update({
        where: { id: item.listingId },
        data: { status: ListingStatus.SOLD, soldAt: new Date() },
      });
    }
    await notify({
      userId: order.buyerId,
      type: "SALE",
      title: "Order completed",
      body: "You can leave a review for this seller.",
      link: `/orders/${order.id}`,
    });
  }
  await notify({
    userId: isSeller ? order.buyerId : order.sellerId,
    type: "PAYMENT",
    title: "Order updated",
    body: `Order ${order.orderNumber} is now ${status.replaceAll("_", " ").toLowerCase()}.`,
    link: `/orders/${order.id}`,
  });
}

export async function refundOrder(orderId: string, reason?: string) {
  const user = await currentUser();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true, seller: { include: { stripeAccount: true } } },
  });
  if (!order) throw new Error("Order not found.");
  if (user.role !== "ADMIN" && user.id !== order.sellerId) throw new Error("Not allowed.");
  if (!order.stripePaymentIntentId) throw new Error("No Stripe payment to refund.");
  const connectAccountId = order.seller.stripeAccount?.stripeAccountId;
  if (!connectAccountId) throw new Error("Seller Stripe account is missing for this refund.");

  // Direct-charge refunds must be created on the connected account; return the application fee too.
  const stripe = getStripe();
  const refund = await stripe.refunds.create(
    {
      payment_intent: order.stripePaymentIntentId,
      reason: "requested_by_customer",
      refund_application_fee: true,
    },
    { stripeAccount: connectAccountId },
  );
  await prisma.refund.create({
    data: {
      orderId,
      stripeRefundId: refund.id,
      amountCents: refund.amount,
      reason,
      initiatedById: user.id,
    },
  });
  await prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.REFUNDED } });
  await prisma.ledgerEntry.create({
    data: {
      orderId,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      itemPriceCents: order.itemPriceCents,
      deliveryFeeCents: order.deliveryFeeCents,
      platformCommissionCents: order.platformFeeCents,
      stripePaymentId: order.stripePaymentIntentId,
      stripeConnectAccountId: connectAccountId,
      refundAmountCents: refund.amount,
      sellerPayoutCents: 0,
      status: "REFUNDED",
      type: "REFUND",
    },
  });
  await notify({
    userId: order.buyerId,
    type: "REFUND",
    title: "Refund issued",
    body: `A refund was processed for order ${order.orderNumber}.`,
    link: `/orders/${order.id}`,
  });
}

export async function openDispute(orderId: string, reason: string, details: string) {
  const user = await currentUser();
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || (order.buyerId !== user.id && order.sellerId !== user.id)) throw new Error("Order not found.");
  await prisma.dispute.create({ data: { orderId, openedById: user.id, reason, details } });
  await prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.DISPUTED } });
  await notify({
    userId: order.sellerId === user.id ? order.buyerId : order.sellerId,
    type: "DISPUTE",
    title: "A dispute was opened",
    body: reason,
    link: `/orders/${orderId}`,
  });
}

export async function leaveReview(orderId: string, rating: number, body?: string) {
  const user = await currentUser();
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.buyerId !== user.id) throw new Error("Only the buyer can review after a completed purchase.");
  if (order.status !== OrderStatus.COMPLETED) throw new Error("Reviews are available after the order is completed.");
  await prisma.review.create({
    data: {
      orderId,
      reviewerId: user.id,
      sellerId: order.sellerId,
      rating: Math.min(5, Math.max(1, rating)),
      body,
    },
  });
}

export async function cancelOrder(orderId: string, reason: string) {
  const user = await currentUser();
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found.");
  if (order.buyerId !== user.id && order.sellerId !== user.id && user.role !== "ADMIN") throw new Error("Not allowed.");
  if (order.status === OrderStatus.PAID || order.status === OrderStatus.SELLER_CONFIRMED) {
    await refundOrder(orderId, reason);
    return;
  }
  await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.CANCELLED, cancelledAt: new Date(), cancelReason: reason },
  });
}
