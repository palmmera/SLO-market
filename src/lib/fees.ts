import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "./db";

export type FeeBreakdown = {
  itemPriceCents: number;
  deliveryFeeCents: number;
  commissionPercent: number;
  platformFeeCents: number;
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
  if (treatment === "DEDUCT_FROM_SELLER") {
    return "Stripe processing fees are deducted from seller proceeds according to Stripe Connect.";
  }
  if (treatment === "ABSORB_BY_PLATFORM") {
    return "SLO Market absorbs Stripe processing fees. They are not deducted from the seller’s item proceeds.";
  }
  return "Stripe processing fees follow the configured Stripe Connect payment structure and are not hard-coded by SLO Market.";
}
