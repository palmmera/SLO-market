"use server";

import { FulfillmentMethod, ListingStatus, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { calculateFees, getPlatformSettings } from "@/lib/fees";
import { connectedAccountCreateParams, getStripe, stripeConfigured } from "@/lib/stripe";
import { orderNumber } from "@/lib/slug";
import { absoluteUrl } from "@/lib/utils";
import { notify } from "@/lib/notifications";

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

export async function createCheckoutSession(listingId: string, fulfillment: FulfillmentMethod) {
  const buyer = await currentUser();
  if (!stripeConfigured()) throw new Error("Payments are not configured yet.");
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { seller: { include: { stripeAccount: true } }, city: true },
  });
  if (!listing || listing.status !== ListingStatus.ACTIVE) throw new Error("This listing is no longer available.");
  if (listing.sellerId === buyer.id) throw new Error("You cannot buy your own listing.");
  if (listing.listingType !== "FOR_SALE" || listing.priceCents <= 0) {
    throw new Error("This listing does not require online payment.");
  }
  const connect = listing.seller.stripeAccount;
  if (!connect || connect.status !== "PAYOUTS_ENABLED" || !connect.payoutsEnabled) {
    throw new Error("This seller has not finished Stripe onboarding, so marketplace payments are not enabled yet.");
  }

  const deliveryFeeCents =
    fulfillment === "LOCAL_DELIVERY" && listing.fulfillment === "LOCAL_DELIVERY" && !listing.freeDelivery
      ? listing.deliveryFeeCents
      : 0;
  if (fulfillment === "LOCAL_DELIVERY" && listing.fulfillment !== "LOCAL_DELIVERY") {
    throw new Error("This seller offers pickup only.");
  }

  const settings = await getPlatformSettings();
  const fees = calculateFees({
    itemPriceCents: listing.priceCents,
    deliveryFeeCents,
    commissionPercent: settings.commissionPercent,
    commissionOnDelivery: settings.commissionOnDelivery,
    stripeFeeTreatment: settings.stripeFeeTreatment,
    deliveryFeeGoesTo: settings.deliveryFeeGoesTo,
  });

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
      items: {
        create: {
          listingId: listing.id,
          title: listing.title,
          priceCents: listing.priceCents,
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

  // Direct charge on the connected account (Stripe-Account header).
  // Stripe bills payment-processing fees to the seller; platform takes application_fee only.
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer_email: buyer.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: listing.priceCents,
            product_data: { name: listing.title },
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

export async function connectStripeAccount() {
  const user = await currentUser();
  if (!stripeConfigured()) throw new Error("Stripe is not configured.");
  const stripe = getStripe();
  let record = await prisma.stripeAccount.findUnique({ where: { userId: user.id } });
  if (!record) {
    // Stripe-handles-pricing Express-style account (no $2/MAA Connect account fee).
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
  const link = await stripe.accountLinks.create({
    account: record.stripeAccountId,
    refresh_url: absoluteUrl("/dashboard/stripe?refresh=1"),
    return_url: absoluteUrl("/dashboard/stripe?return=1"),
    type: "account_onboarding",
  });
  return link.url;
}

export async function refreshStripeStatus() {
  const user = await currentUser();
  const record = await prisma.stripeAccount.findUnique({ where: { userId: user.id } });
  if (!record || !stripeConfigured()) return record;
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
}

export async function openStripeDashboard() {
  const user = await currentUser();
  const record = await prisma.stripeAccount.findUnique({ where: { userId: user.id } });
  if (!record) throw new Error("Connect Stripe first.");
  const link = await getStripe().accounts.createLoginLink(record.stripeAccountId);
  return link.url;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const user = await currentUser();
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: { include: { listing: true } } } });
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
