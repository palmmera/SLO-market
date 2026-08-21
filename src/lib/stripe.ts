import Stripe from "stripe";

/**
 * Stripe Connect model for SLO Market (matches current Stripe Accounts API):
 *
 * - Express dashboard via controller properties (not deprecated `type: "express"` alone)
 * - Platform collects Connect fees + is liable for losses (required for Express)
 * - Charge type: Direct charges (`Stripe-Account` header)
 * - Platform monetization: `application_fee_amount` = marketplace commission (default 12%)
 */
export const STRIPE_CONNECT = {
  pricingModel: "express_direct_charges",
  accountDashboard: "express",
  chargeType: "direct",
  feesPayer: "application",
  lossesPayments: "application",
  requirementCollection: "stripe",
} as const;

let stripeClient: Stripe | null = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key, { typescript: true });
  }
  return stripeClient;
}

export function stripeConfigured() {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  return Boolean(secret && publishable && secret.startsWith("sk_") && publishable.startsWith("pk_"));
}

/**
 * Express connected account — exact combination Stripe documents for Express:
 * fees.payer=application, losses.payments=application, stripe_dashboard.type=express
 */
export function connectedAccountCreateParams(input: {
  email: string;
  userId: string;
}): Stripe.AccountCreateParams {
  return {
    country: "US",
    email: input.email,
    controller: {
      fees: { payer: "application" },
      losses: { payments: "application" },
      stripe_dashboard: { type: "express" },
      requirement_collection: "stripe",
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: { userId: input.userId },
  };
}
