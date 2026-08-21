import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
import { ListingStatus, OrderStatus } from "@prisma/client";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { notify, notifyFavoritesListingChange } from "@/lib/notifications";

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  // Two Stripe webhook endpoints point here, each with its own signing secret:
  // one for connected-account events (marketplace sales) and one for platform
  // events (enhanced descriptions). Accept a signature from either.
  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_WEBHOOK_SECRET_2]
    .map((s) => s?.trim())
    .filter((s): s is string => Boolean(s));
  if (!signature || secrets.length === 0) {
    return NextResponse.json({ error: "Missing webhook secret" }, { status: 400 });
  }
  const body = await req.text();
  let event: Stripe.Event | null = null;
  for (const secret of secrets) {
    try {
      event = getStripe().webhooks.constructEvent(body, signature, secret);
      break;
    } catch {
      // try the next secret
    }
  }
  if (!event) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.type === "enhanced_description" && session.metadata.listingId) {
        await prisma.listing.update({
          where: { id: session.metadata.listingId },
          data: { enhancedDescription: true },
        });
        await prisma.enhancedDescriptionPurchase.updateMany({
          where: { listingId: session.metadata.listingId, status: "PENDING" },
          data: {
            status: "PAID",
            stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
          },
        });
        await prisma.ledgerEntry.create({
          data: {
            listingId: session.metadata.listingId,
            enhancedDescriptionCents: session.amount_total ?? 100,
            stripePaymentId: typeof session.payment_intent === "string" ? session.payment_intent : session.id,
            status: "PAID",
            type: "ENHANCED_DESCRIPTION",
          },
        });
        break;
      }
      if (session.metadata?.orderId) {
        await fulfillMarketplaceOrder(session);
      }
      break;
    }
    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      const orderId = intent.metadata?.orderId;
      if (orderId) {
        await prisma.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.PAYMENT_PENDING },
        });
      }
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (pi) {
        const order = await prisma.order.findFirst({ where: { stripePaymentIntentId: pi } });
        if (order && order.status !== OrderStatus.REFUNDED) {
          await prisma.order.update({ where: { id: order.id }, data: { status: OrderStatus.REFUNDED } });
        }
      }
      break;
    }
    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      const status = account.payouts_enabled
        ? "PAYOUTS_ENABLED"
        : account.details_submitted
          ? "CONNECTED"
          : "SETUP_INCOMPLETE";
      const record = await prisma.stripeAccount.updateMany({
        where: { stripeAccountId: account.id },
        data: {
          detailsSubmitted: Boolean(account.details_submitted),
          chargesEnabled: Boolean(account.charges_enabled),
          payoutsEnabled: Boolean(account.payouts_enabled),
          status,
        },
      });
      if (record.count && !account.payouts_enabled) {
        const row = await prisma.stripeAccount.findFirst({ where: { stripeAccountId: account.id } });
        if (row) {
          await notify({
            userId: row.userId,
            type: "STRIPE_ONBOARDING",
            title: "Stripe setup needs attention",
            body: "Finish Stripe verification so you can receive marketplace payouts.",
            link: "/dashboard/stripe",
          });
        }
      }
      break;
    }
    case "transfer.updated":
    case "payout.paid":
    case "payout.failed":
    case "charge.dispute.created":
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}

async function fulfillMarketplaceOrder(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId;
  if (!orderId) return;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { listing: true } }, seller: { include: { stripeAccount: true } } },
  });
  if (!order) return;
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: OrderStatus.PAID,
      paidAt: new Date(),
      stripePaymentIntentId: paymentIntentId,
    },
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
      data: { status: ListingStatus.RESERVED },
    });
    await notifyFavoritesListingChange(item.listingId, "LISTING_SOLD", "Item reserved", `${item.title} was purchased.`);
  }
  await notify({
    userId: order.sellerId,
    type: "SALE",
    title: "You made a sale",
    body: `Order ${order.orderNumber} is paid. Confirm and arrange pickup or delivery.`,
    link: `/orders/${order.id}`,
  });
  await notify({
    userId: order.buyerId,
    type: "PURCHASE",
    title: "Payment received",
    body: `Your payment for order ${order.orderNumber} went through.`,
    link: `/orders/${order.id}`,
  });
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
