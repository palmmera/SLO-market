import Stripe from "stripe";

/**
 * Stripe Connect model for SLO Market (verified against Stripe Connect pricing):
 *
 * - Pricing model: "Stripe handles pricing" (not "You handle pricing")
 * - Why: avoids the $2 / monthly active connected account fee and payout Connect fees
 *   that apply when the platform is responsible for Stripe's payment pricing
 * - Connected accounts: Express Dashboard UX via controller properties
 *   (`controller.fees.payer = account`, Stripe collects processing fees from sellers)
 * - Charge type: Direct charges on the connected account (`Stripe-Account` header)
 * - Platform monetization: `application_fee_amount` = marketplace commission (default 12%)
 * - No seller subscription / monthly platform / listing fee for Connect itself
 *
 * Do not use destination charges for marketplace sales under this configuration —
 * destination charges bill Stripe fees to the platform and fall under "You handle pricing".
 */
export const STRIPE_CONNECT = {
  pricingModel: "stripe_handles_pricing",
  accountDashboard: "express",
  chargeType: "direct",
  feesPayer: "account",
  lossesPayments: "stripe",
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
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}

/** Create a connected account eligible for Stripe-handles-pricing + direct charges. */
export function connectedAccountCreateParams(input: {
  email: string;
  userId: string;
}): Stripe.AccountCreateParams {
  return {
    country: "US",
    email: input.email,
    controller: {
      fees: { payer: "account" },
      losses: { payments: "stripe" },
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
