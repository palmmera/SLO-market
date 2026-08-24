import Stripe from "stripe";
import { ListingStatus, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notify, notifyFavoritesListingChange } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

/** Mark a marketplace order paid after Stripe Checkout succeeds. Safe to call more than once. */
export async function fulfillMarketplaceOrder(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId;
  if (!orderId) return { ok: false as const, reason: "missing_order" };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { listing: { include: { hotspot: true, collection: true } } } },
      seller: { include: { stripeAccount: true } },
    },
  });
  if (!order) return { ok: false as const, reason: "order_not_found" };

  // Already fulfilled (webhook + success-page race).
  if (order.status !== OrderStatus.PAYMENT_PENDING && order.status !== OrderStatus.CANCELLED) {
    return { ok: true as const, alreadyPaid: true as const, orderId: order.id };
  }

  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: OrderStatus.COMPLETED,
      paidAt: new Date(),
      completedAt: new Date(),
      stripePaymentIntentId: paymentIntentId,
      stripeCheckoutSessionId: session.id,
    },
  });
  // Drop abandoned checkouts for this buyer so they never clutter "Active orders".
  await prisma.order.updateMany({
    where: {
      buyerId: order.buyerId,
      status: OrderStatus.PAYMENT_PENDING,
      id: { not: order.id },
    },
    data: { status: OrderStatus.CANCELLED, cancelledAt: new Date(), cancelReason: "Abandoned checkout" },
  });
  await prisma.payment.upsert({
    where: { orderId: order.id },
    update: { status: "paid", stripePaymentIntentId: paymentIntentId || session.id, amountCents: order.totalCents },
    create: {
      orderId: order.id,
      stripePaymentIntentId: paymentIntentId || session.id,
      amountCents: order.totalCents,
      status: "paid",
    },
  });
  await prisma.platformFee.upsert({
    where: { orderId: order.id },
    update: { amountCents: order.platformFeeCents },
    create: {
      orderId: order.id,
      amountCents: order.platformFeeCents,
      percent: (order.platformFeeCents / Math.max(order.itemPriceCents, 1)) * 100,
    },
  });
  if (order.seller.stripeAccount) {
    await prisma.payout.upsert({
      where: { orderId: order.id },
      update: { status: "pending_stripe", amountCents: order.sellerPayoutCents },
      create: {
        orderId: order.id,
        stripeConnectAccountId: order.seller.stripeAccount.stripeAccountId,
        amountCents: order.sellerPayoutCents,
        status: "created_via_direct_charge",
      },
    });
  }
  await prisma.ledgerEntry.create({
    data: {
      orderId: order.id,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      listingId: order.items[0]?.listingId,
      itemPriceCents: order.itemPriceCents,
      deliveryFeeCents: order.deliveryFeeCents,
      platformCommissionCents: order.platformFeeCents,
      stripePaymentId: paymentIntentId,
      stripeConnectAccountId: order.seller.stripeAccount?.stripeAccountId,
      sellerPayoutCents: order.sellerPayoutCents,
      status: "PAID",
      type: "MARKETPLACE_SALE",
    },
  });
  for (const item of order.items) {
    await prisma.listing.update({
      where: { id: item.listingId },
      data: { status: ListingStatus.SOLD, soldAt: new Date() },
    });
    if (item.listing.hotspot) {
      await prisma.listingHotspot.update({
        where: { listingId: item.listingId },
        data: { markerLabel: "Sold" },
      });
    }
    if (item.listing.collection?.slug) {
      revalidatePath(`/collection/${item.listing.collection.slug}`);
    }
    await notifyFavoritesListingChange(item.listingId, "LISTING_SOLD", "Item sold", `${item.title} was purchased.`);
  }
  await notify({
    userId: order.sellerId,
    type: "SALE",
    title: "You made a sale",
    body: `Order ${order.orderNumber} is paid. Message the buyer to arrange pickup or delivery.`,
    link: `/orders/${order.id}`,
  });
  await notify({
    userId: order.buyerId,
    type: "PURCHASE",
    title: "Purchase complete",
    body: `Your payment for order ${order.orderNumber} went through. Message the seller to arrange pickup or delivery.`,
    link: `/orders/${order.id}`,
  });

  const existingConversation = await prisma.conversation.findFirst({
    where: { orderId: order.id },
  });
  if (!existingConversation) {
    await prisma.conversation.create({
      data: {
        listingId: order.items[0]?.listingId,
        orderId: order.id,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
        messages: {
          create: {
            senderId: order.buyerId,
            body: "Hi, I just purchased this. Can we arrange pickup or delivery?",
            listingId: order.items[0]?.listingId,
            orderId: order.id,
          },
        },
      },
    });
  }

  revalidatePath(`/orders/${order.id}`);
  revalidatePath("/dashboard");
  return { ok: true as const, alreadyPaid: false as const, orderId: order.id };
}
