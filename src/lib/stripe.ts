import Stripe from "stripe";

/**
 * Stripe Connect model for SLO Market:
 *
 * - Connected accounts: Express (`type: "express"`)
 * - Charge type: Direct charges on the connected account (`Stripe-Account` header)
 * - Platform monetization: `application_fee_amount` = marketplace commission (default 12%)
 * - With Express + direct charges, Stripe bills card-processing fees to the connected
 *   account (`controller.fees.payer` resolves to `application_express`)
 * - Platform is liable for connected-account losses (Express requirement)
 * - No seller subscription / monthly platform / listing fee for Connect itself
 *
 * Note: You cannot combine `stripe_dashboard.type=express` with `fees.payer=account`
 * or `losses.payments=stripe` — Stripe rejects that combination.
 */
export const STRIPE_CONNECT = {
  pricingModel: "express_direct_charges",
  accountDashboard: "express",
  chargeType: "direct",
  feesPayer: "application_express",
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

/** Create an Express connected account for marketplace direct charges. */
export function connectedAccountCreateParams(input: {
  email: string;
  userId: string;
}): Stripe.AccountCreateParams {
  return {
    type: "express",
    country: "US",
    email: input.email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: { userId: input.userId },
  };
}
