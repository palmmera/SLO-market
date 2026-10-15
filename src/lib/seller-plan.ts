import { CollectionType, ListingStatus, ListingType, PaymentMethod, SellerPlanStatus } from "@prisma/client";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { absoluteUrl } from "@/lib/utils";
import { FREE_CASH_GARAGE_SALE_LIMIT, FREE_CASH_PRODUCT_LIMIT, SELLER_PLAN_MONTHLY_CENTS } from "@/lib/constants";

export const SELLER_PLAN_LOOKUP_KEY = "slo_seller_plan_monthly";

/** Photo sales that count as the one free cash garage sale. Produce stands do not. */
export const GARAGE_COLLECTION_TYPES: CollectionType[] = [
  CollectionType.GARAGE_SALE,
  CollectionType.YARD_SALE,
  CollectionType.ROOM,
  CollectionType.OTHER,
];

export const SELLER_PLAN_PRODUCT_MESSAGE =
  "A free account includes 20 cash products. Another cash product needs the $10/month Seller Plan. Card or both skips this limit. Card sales stay at 12%.";

export const SELLER_PLAN_GARAGE_MESSAGE =
  "A free account includes 1 cash garage sale. Another cash garage sale needs the $10/month Seller Plan. Card or both skips this limit. Card sales stay at 12%.";

export function isSellerPlanError(message: string) {
  return message.includes("Seller Plan");
}

export function parsePaymentMethod(value: unknown, cashAllowed: boolean): PaymentMethod {
  if (!cashAllowed) return PaymentMethod.CARD;
  const raw = String(value || PaymentMethod.CARD);
  if (raw === PaymentMethod.CASH || raw === PaymentMethod.BOTH || raw === PaymentMethod.CARD) return raw;
  return PaymentMethod.CARD;
}

export function acceptsCard(method: PaymentMethod | string | null | undefined) {
  return method === PaymentMethod.CARD || method === PaymentMethod.BOTH;
}

type PlanRow = {
  status: SellerPlanStatus;
  currentPeriodEnd: Date | null;
} | null;

export function subscriptionIsActive(sub: PlanRow) {
  if (!sub) return false;
  if (sub.status === SellerPlanStatus.ACTIVE || sub.status === SellerPlanStatus.PAST_DUE) return true;
  if (sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() > Date.now()) return true;
  return false;
}

function periodEndFromSubscription(sub: Stripe.Subscription): Date | null {
  const raw = sub as Stripe.Subscription & {
    current_period_end?: number;
    items?: { data?: { current_period_end?: number }[] };
  };
  const unix = raw.current_period_end ?? raw.items?.data?.[0]?.current_period_end;
  return typeof unix === "number" ? new Date(unix * 1000) : null;
}

function mapPlanStatus(status: Stripe.Subscription.Status): SellerPlanStatus {
  if (status === "active" || status === "trialing") return SellerPlanStatus.ACTIVE;
  if (status === "past_due") return SellerPlanStatus.PAST_DUE;
  if (status === "incomplete") return SellerPlanStatus.INCOMPLETE;
  return SellerPlanStatus.CANCELED;
}

export async function hasActiveSellerPlan(userId: string) {
  const sub = await prisma.sellerSubscription.findUnique({ where: { userId } });
  return subscriptionIsActive(sub);
}

export async function getSellerPlanUsage(userId: string) {
  const [subscription, cashProducts, cashGarages] = await Promise.all([
    prisma.sellerSubscription.findUnique({ where: { userId } }),
    prisma.listing.count({
      where: {
        sellerId: userId,
        status: ListingStatus.ACTIVE,
        collectionId: null,
        paymentMethod: PaymentMethod.CASH,
        listingType: ListingType.FOR_SALE,
      },
    }),
    prisma.collection.count({
      where: {
        sellerId: userId,
        status: ListingStatus.ACTIVE,
        paymentMethod: PaymentMethod.CASH,
        type: { in: GARAGE_COLLECTION_TYPES },
      },
    }),
  ]);
  return {
    active: subscriptionIsActive(subscription),
    currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: Boolean(subscription?.cancelAtPeriodEnd),
    cashProducts,
    cashGarages,
    productLimit: FREE_CASH_PRODUCT_LIMIT,
    garageLimit: FREE_CASH_GARAGE_SALE_LIMIT,
  };
}

export async function assertCashProductAllowed(sellerId: string, excludeListingId?: string) {
  if (await hasActiveSellerPlan(sellerId)) return;
  const count = await prisma.listing.count({
    where: {
      sellerId,
      status: ListingStatus.ACTIVE,
      collectionId: null,
      paymentMethod: PaymentMethod.CASH,
      listingType: ListingType.FOR_SALE,
      ...(excludeListingId ? { id: { not: excludeListingId } } : {}),
    },
  });
  if (count >= FREE_CASH_PRODUCT_LIMIT) {
    throw new Error(SELLER_PLAN_PRODUCT_MESSAGE);
  }
}

export async function assertCashGarageAllowed(sellerId: string, excludeCollectionId?: string) {
  if (await hasActiveSellerPlan(sellerId)) return;
  const count = await prisma.collection.count({
    where: {
      sellerId,
      status: ListingStatus.ACTIVE,
      paymentMethod: PaymentMethod.CASH,
      type: { in: GARAGE_COLLECTION_TYPES },
      ...(excludeCollectionId ? { id: { not: excludeCollectionId } } : {}),
    },
  });
  if (count >= FREE_CASH_GARAGE_SALE_LIMIT) {
    throw new Error(SELLER_PLAN_GARAGE_MESSAGE);
  }
}

async function sellerPlanPriceId() {
  const stripe = getStripe();
  const existing = await stripe.prices.list({
    lookup_keys: [SELLER_PLAN_LOOKUP_KEY],
    active: true,
    limit: 1,
  });
  if (existing.data[0]) return existing.data[0].id;
  const product = await stripe.products.create({
    name: "SLO Market Seller Plan",
    metadata: { type: "seller_plan" },
  });
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: SELLER_PLAN_MONTHLY_CENTS,
    currency: "usd",
    recurring: { interval: "month" },
    lookup_key: SELLER_PLAN_LOOKUP_KEY,
  });
  return price.id;
}

async function sellerCustomerId(userId: string) {
  const existing = await prisma.sellerSubscription.findUnique({ where: { userId } });
  if (existing?.stripeCustomerId) return existing.stripeCustomerId;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Please sign in first.");
  const customer = await getStripe().customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId, type: "seller_plan" },
  });
  await prisma.sellerSubscription.upsert({
    where: { userId },
    create: { userId, stripeCustomerId: customer.id, status: SellerPlanStatus.INCOMPLETE },
    update: { stripeCustomerId: customer.id },
  });
  return customer.id;
}

export async function syncSellerSubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  const userId = sub.metadata?.userId;
  const data = {
    stripeSubscriptionId: sub.id,
    status: mapPlanStatus(sub.status),
    currentPeriodEnd: periodEndFromSubscription(sub),
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    ...(customerId ? { stripeCustomerId: customerId } : {}),
  };

  if (userId) {
    const row = await prisma.sellerSubscription.findUnique({ where: { userId } });
    if (row) {
      await prisma.sellerSubscription.update({ where: { userId }, data });
      return;
    }
    if (!customerId) return;
    await prisma.sellerSubscription.create({
      data: { userId, stripeCustomerId: customerId, ...data },
    });
    return;
  }

  if (!customerId) return;
  await prisma.sellerSubscription.updateMany({
    where: { stripeCustomerId: customerId },
    data,
  });
}

export async function syncSellerPlanCheckout(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  if (!subscriptionId || !stripeConfigured()) return;
  const sub = await getStripe().subscriptions.retrieve(subscriptionId);
  if (userId && !sub.metadata?.userId) {
    await syncSellerSubscription({ ...sub, metadata: { ...sub.metadata, userId } });
    return;
  }
  await syncSellerSubscription(sub);
}

export async function beginSellerPlanCheckout(userId: string, returnPath = "/dashboard") {
  if (!stripeConfigured()) {
    return { error: "Stripe is not configured on the server yet." };
  }
  const existing = await prisma.sellerSubscription.findUnique({ where: { userId } });
  const stripe = getStripe();
  const customer = await sellerCustomerId(userId);
  if (subscriptionIsActive(existing)) {
    try {
      const portal = await stripe.billingPortal.sessions.create({
        customer,
        return_url: absoluteUrl(returnPath),
      });
      return { url: portal.url };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not open billing.";
      return { error: message.length < 180 ? message : "You already have an active Seller Plan." };
    }
  }
  const price = await sellerPlanPriceId();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price, quantity: 1 }],
    success_url: absoluteUrl(`${returnPath}${returnPath.includes("?") ? "&" : "?"}plan=success`),
    cancel_url: absoluteUrl(`${returnPath}${returnPath.includes("?") ? "&" : "?"}plan=cancelled`),
    metadata: { type: "seller_plan", userId },
    subscription_data: { metadata: { type: "seller_plan", userId } },
  });
  if (!session.url) return { error: "Stripe did not return a checkout link." };
  return { url: session.url };
}

export async function beginSellerPlanPortal(userId: string, returnPath = "/dashboard") {
  if (!stripeConfigured()) return { error: "Stripe is not configured on the server yet." };
  const existing = await prisma.sellerSubscription.findUnique({ where: { userId } });
  if (!existing?.stripeCustomerId) return { error: "Subscribe to the Seller Plan first." };
  try {
    const portal = await getStripe().billingPortal.sessions.create({
      customer: existing.stripeCustomerId,
      return_url: absoluteUrl(returnPath),
    });
    return { url: portal.url };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not open billing.";
    return { error: message.length < 200 ? message : "Could not open billing. Try again from the dashboard." };
  }
}
