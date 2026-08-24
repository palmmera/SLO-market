"use server";

import { revalidatePath } from "next/cache";
import {
  FoodProductionSource,
  FoodSellerStatus,
  PermitRequiredAnswer,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { saveDocument } from "@/lib/storage";
import { FOOD_SELLER_POLICY_VERSION } from "@/lib/food-seller";

async function currentUser() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Please sign in first.");
  return session.user;
}

export async function activateFoodSeller(formData: FormData) {
  const user = await currentUser();

  const fullName = String(formData.get("fullName") || "").trim();
  const businessName = String(formData.get("businessName") || "").trim() || null;
  const cityId = String(formData.get("cityId") || "");
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const productionSource = String(formData.get("productionSource") || "") as FoodProductionSource;
  const productionSourceOther = String(formData.get("productionSourceOther") || "").trim() || null;
  const permitRequired = String(formData.get("permitRequired") || "") as PermitRequiredAnswer;
  const otherProductDesc = String(formData.get("otherProductDesc") || "").trim() || null;

  const productTypes = formData.getAll("productTypes").map(String).filter(Boolean);
  if (!fullName || !cityId || !email || !phone) throw new Error("Name, city, email, and phone are required.");
  if (!productTypes.length) throw new Error("Select at least one product type you sell.");
  if (!productionSource) throw new Error("Select where your product is produced.");
  if (!permitRequired) throw new Error("Indicate whether a permit or registration is required.");

  const requiredCerts = [
    "certCompliance",
    "certCottageFood",
    "certNoProhibited",
    "certLabeling",
    "certRemoveNonCompliant",
    "certOwner",
    "certMarketplaceDisclaimer",
    "certTerms",
  ] as const;
  for (const key of requiredCerts) {
    if (formData.get(key) !== "on") throw new Error("Please accept all required certifications.");
  }

  const city = await prisma.city.findUnique({ where: { id: cityId } });
  if (!city) throw new Error("Choose a valid city.");

  let permitType: string | null = null;
  let permitNumber: string | null = null;
  let permitAgency: string | null = null;
  let permitExpiresAt: Date | null = null;
  let permitDocumentUrl: string | null = null;

  if (permitRequired === "YES") {
    permitType = String(formData.get("permitType") || "").trim() || null;
    permitNumber = String(formData.get("permitNumber") || "").trim() || null;
    permitAgency = String(formData.get("permitAgency") || "").trim() || null;
    const expiry = String(formData.get("permitExpiresAt") || "").trim();
    permitExpiresAt = expiry ? new Date(expiry) : null;
    const doc = formData.get("permitDocument");
    if (doc instanceof File && doc.size > 0) {
      permitDocumentUrl = await saveDocument(doc);
    }
  }

  await prisma.foodSellerProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      fullName,
      businessName,
      cityId,
      email,
      phone,
      productTypes,
      otherProductDesc,
      productionSource,
      productionSourceOther,
      permitRequired,
      permitType,
      permitNumber,
      permitAgency,
      permitExpiresAt,
      permitDocumentUrl,
      certCompliance: true,
      certCottageFood: true,
      certNoProhibited: true,
      certLabeling: true,
      certRemoveNonCompliant: true,
      certOwner: true,
      certMarketplaceDisclaimer: true,
      certTerms: true,
      policyVersion: FOOD_SELLER_POLICY_VERSION,
      status: FoodSellerStatus.ACTIVE,
      verifiedAt: new Date(),
    },
    update: {
      fullName,
      businessName,
      cityId,
      email,
      phone,
      productTypes,
      otherProductDesc,
      productionSource,
      productionSourceOther,
      permitRequired,
      permitType,
      permitNumber,
      permitAgency,
      permitExpiresAt,
      permitDocumentUrl,
      certCompliance: true,
      certCottageFood: true,
      certNoProhibited: true,
      certLabeling: true,
      certRemoveNonCompliant: true,
      certOwner: true,
      certMarketplaceDisclaimer: true,
      certTerms: true,
      policyVersion: FOOD_SELLER_POLICY_VERSION,
      status: FoodSellerStatus.ACTIVE,
      verifiedAt: new Date(),
    },
  });

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/food-seller");
  revalidatePath("/sell/food");
  return { ok: true as const };
}

export async function assertFoodSellerForProduce(userId: string) {
  const profile = await prisma.foodSellerProfile.findFirst({
    where: { userId, status: FoodSellerStatus.ACTIVE },
  });
  if (!profile) {
    throw new Error("Activate Local Food & Produce Seller status before listing food or produce.");
  }
  return profile;
}
