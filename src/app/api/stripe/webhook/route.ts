import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
import { OrderStatus } from "@prisma/client";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { notify } from "@/lib/notifications";
import { formatMoney } from "@/lib/utils";
import { fulfillMarketplaceOrder } from "@/lib/fulfill-order";

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
    case "payout.paid": {
      const payout = event.data.object as Stripe.Payout;
      if (event.account) {
        const acct = await prisma.stripeAccount.findFirst({ where: { stripeAccountId: event.account } });
        if (acct) {
          await notify({
            userId: acct.userId,
            type: "PAYMENT",
            title: "Payout sent",
            body: `A payout of ${formatMoney(payout.amount)} is on its way to your bank account.`,
            link: "/dashboard",
          });
        }
      }
      break;
    }
    case "payout.failed": {
      const payout = event.data.object as Stripe.Payout;
      if (event.account) {
        const acct = await prisma.stripeAccount.findFirst({ where: { stripeAccountId: event.account } });
        if (acct) {
          await notify({
            userId: acct.userId,
            type: "PAYMENT",
            title: "Payout failed",
            body: `A payout of ${formatMoney(payout.amount)} could not be completed. Please check your bank details in Stripe.`,
            link: "/dashboard/stripe",
          });
        }
      }
      break;
    }
    case "transfer.updated":
    case "charge.dispute.created":
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
