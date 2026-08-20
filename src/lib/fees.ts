import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "./db";

export type FeeBreakdown = {
  itemPriceCents: number;
  deliveryFeeCents: number;
  commissionPercent: number;
  platformFeeCents: number;
  /** Seller share before Stripe's card-processing fees (Stripe deducts those from the connected account). */
  sellerPayoutCents: number;
  totalCents: number;
  commissionOnDelivery: boolean;
  stripeFeeTreatment: "DEDUCT_FROM_SELLER" | "ABSORB_BY_PLATFORM" | "CONNECT_DEFAULT";
  deliveryFeeGoesTo: string;
};

export async function getPlatformSettings() {
  return prisma.platformSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      commissionPercent: 12,
      commissionOnDelivery: false,
      stripeFeeTreatment: "CONNECT_DEFAULT",
      enhancedDescriptionCents: 100,
      deliveryFeeGoesTo: "SELLER",
    },
  });
}

export function roundCents(value: number) {
  return Math.round(value);
}

export function calculateFees(input: {
  itemPriceCents: number;
  deliveryFeeCents?: number;
  commissionPercent: Decimal | number;
  commissionOnDelivery: boolean;
  stripeFeeTreatment: FeeBreakdown["stripeFeeTreatment"];
  deliveryFeeGoesTo?: string;
}): FeeBreakdown {
  const itemPriceCents = Math.max(0, input.itemPriceCents);
  const deliveryFeeCents = Math.max(0, input.deliveryFeeCents ?? 0);
  const commissionPercent = Number(input.commissionPercent);
  const commissionBase = input.commissionOnDelivery ? itemPriceCents + deliveryFeeCents : itemPriceCents;
  const platformFeeCents = roundCents(commissionBase * (commissionPercent / 100));
  const deliveryToSeller = (input.deliveryFeeGoesTo ?? "SELLER") !== "PLATFORM";
  const sellerPayoutCents = itemPriceCents - platformFeeCents + (deliveryToSeller ? deliveryFeeCents : 0);

  return {
    itemPriceCents,
    deliveryFeeCents,
    commissionPercent,
    platformFeeCents,
    sellerPayoutCents: Math.max(0, sellerPayoutCents),
    totalCents: itemPriceCents + deliveryFeeCents,
    commissionOnDelivery: input.commissionOnDelivery,
    stripeFeeTreatment: input.stripeFeeTreatment,
    deliveryFeeGoesTo: input.deliveryFeeGoesTo ?? "SELLER",
  };
}

export function stripeFeeCopy(treatment: FeeBreakdown["stripeFeeTreatment"]) {
  if (treatment === "ABSORB_BY_PLATFORM") {
    return "Note: under Stripe-handles-pricing direct charges, Stripe bills card-processing fees to the seller’s connected account; the platform cannot absorb those Stripe fees in this Connect model.";
  }
  // CONNECT_DEFAULT and DEDUCT_FROM_SELLER both match Stripe-handles-pricing behavior.
  return "Stripe card-processing fees are billed by Stripe to the seller’s connected account (Stripe handles pricing). SLO Market only collects its marketplace commission as an application fee—there is no $2/month Connect account fee on this model.";
}

export function marketplaceCommissionCopy(commissionPercent: number | Decimal, commissionOnDelivery: boolean) {
  const pct = Number(commissionPercent);
  return `SLO Market collects a ${pct}% marketplace commission on the item price through Stripe Connect application fees. Listings are free—there are no monthly seller or buyer fees. Delivery fees are ${
    commissionOnDelivery ? "included in" : "not included in"
  } the commission base.`;
}
