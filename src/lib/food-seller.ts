import { FoodSellerStatus, ProduceProductType } from "@prisma/client";
import { prisma } from "@/lib/db";

export const FOOD_SELLER_POLICY_VERSION = "2026-08-24";

export const ACTIVATION_PRODUCT_TYPES = [
  { value: "fresh_fruits_veg", label: "Fresh fruits or vegetables that I grow" },
  { value: "herbs_plants", label: "Fresh herbs or plants" },
  { value: "honey", label: "Honey" },
  { value: "jam_jelly", label: "Jam / Jelly / Preserves" },
  { value: "pickled", label: "Pickled or preserved foods" },
  { value: "other", label: "Other local food product" },
] as const;

export const PRODUCTION_SOURCES = [
  { value: "GROW_MYSELF", label: "I grow/produce it myself" },
  { value: "HOME_PRODUCTION", label: "I produce it at my home" },
  { value: "COMMERCIAL_FACILITY", label: "I produce it at a permitted commercial facility" },
  { value: "RESELL", label: "I purchase it from another producer and resell it" },
  { value: "OTHER", label: "Other" },
] as const;

export const PRODUCE_PRODUCT_TYPES = [
  { value: "FRESH_PRODUCE" as ProduceProductType, label: "Fresh Produce", categorySlug: "vegetables", requiresPermit: false },
  { value: "HONEY" as ProduceProductType, label: "Honey", categorySlug: "honey", requiresPermit: true },
  { value: "JAM_JELLY" as ProduceProductType, label: "Jam / Jelly / Preserves", categorySlug: "other-produce", requiresPermit: true },
  { value: "PICKLED_PRESERVED" as ProduceProductType, label: "Pickled / Preserved Food", categorySlug: "other-produce", requiresPermit: true },
  { value: "OTHER" as ProduceProductType, label: "Other", categorySlug: "other-produce", requiresPermit: true },
] as const;

export function produceTypeRequiresPermit(type: ProduceProductType) {
  return PRODUCE_PRODUCT_TYPES.find((t) => t.value === type)?.requiresPermit ?? false;
}

export const FOOD_SELLER_REQUIRED_MESSAGE =
  "Please complete Local Food & Produce Seller verification before listing food or produce. Open Local food & produce to fill out the one-time form.";

export async function getActiveFoodSeller(userId: string) {
  try {
    return await prisma.foodSellerProfile.findFirst({
      where: { userId, status: FoodSellerStatus.ACTIVE },
    });
  } catch {
    return null;
  }
}

export async function isActiveFoodSeller(userId: string) {
  const profile = await getActiveFoodSeller(userId);
  return Boolean(profile);
}

export async function resolveProduceCategoryId(productType: ProduceProductType) {
  const meta = PRODUCE_PRODUCT_TYPES.find((t) => t.value === productType);
  const slug = meta?.categorySlug ?? "other-produce";
  const category = await prisma.category.findFirst({ where: { slug } });
  if (!category) {
    const parent = await prisma.category.findFirst({ where: { slug: "local-produce" }, include: { children: true } });
    return parent?.children[0]?.id ?? parent?.id;
  }
  return category.id;
}

export type ListingPermitDetails = {
  produceProductType?: ProduceProductType;
  permitType?: string;
  permitNumber?: string;
  permitAgency?: string;
  permitExpiresAt?: string;
};

export function buildProduceExtraDetails(formData: FormData, existing?: Record<string, unknown> | null) {
  const produceProductType = String(formData.get("produceProductType") || "") as ProduceProductType;
  const base = { ...(existing || {}), produceProductType };

  if (!produceProductType || produceProductType === "FRESH_PRODUCE") {
    return base;
  }

  return {
    ...base,
    permitType: String(formData.get("listingPermitType") || "").trim() || undefined,
    permitNumber: String(formData.get("listingPermitNumber") || "").trim() || undefined,
    permitAgency: String(formData.get("listingPermitAgency") || "").trim() || undefined,
    permitExpiresAt: String(formData.get("listingPermitExpiresAt") || "").trim() || undefined,
  };
}

export function parseListingPermitDetails(extraDetails: unknown): ListingPermitDetails {
  if (!extraDetails || typeof extraDetails !== "object") return {};
  const d = extraDetails as Record<string, unknown>;
  return {
    produceProductType: d.produceProductType as ProduceProductType | undefined,
    permitType: typeof d.permitType === "string" ? d.permitType : undefined,
    permitNumber: typeof d.permitNumber === "string" ? d.permitNumber : undefined,
    permitAgency: typeof d.permitAgency === "string" ? d.permitAgency : undefined,
    permitExpiresAt: typeof d.permitExpiresAt === "string" ? d.permitExpiresAt : undefined,
  };
}
