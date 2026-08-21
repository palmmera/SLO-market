"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ListingStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function adminRemoveListing(listingId: string) {
  await requireAdmin();
  await prisma.listing.update({ where: { id: listingId }, data: { status: ListingStatus.REMOVED } });
  await prisma.auditLog.create({ data: { action: "REMOVE_LISTING", target: listingId } });
  revalidatePath("/admin");
}

export async function adminFeatureListing(listingId: string, featured: boolean) {
  await requireAdmin();
  await prisma.listing.update({
    where: { id: listingId },
    data: { isFeatured: featured, featuredUntil: featured ? new Date(Date.now() + 7 * 86400000) : null },
  });
  if (featured) {
    await prisma.featuredListing.create({ data: { listingId, startsAt: new Date() } });
  }
  revalidatePath("/admin");
}

export async function adminSuspendUser(userId: string, reason: string) {
  await requireAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: { isSuspended: true, suspendedAt: new Date(), suspendReason: reason },
  });
  revalidatePath("/admin");
}

export async function adminDeleteUser(userId: string) {
  await requireAdmin();
  await prisma.listing.updateMany({ where: { sellerId: userId }, data: { status: ListingStatus.REMOVED } });
  await prisma.user.update({
    where: { id: userId },
    data: { isSuspended: true, email: `deleted-${userId}@slomarket.invalid`, name: "Deleted user" },
  });
  revalidatePath("/admin");
}

export async function adminResolveReport(reportId: string) {
  await requireAdmin();
  await prisma.report.update({ where: { id: reportId }, data: { status: "RESOLVED" } });
  revalidatePath("/admin");
}

export async function adminSaveCategory(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const data = {
    name: String(formData.get("name")),
    slug: String(formData.get("slug")),
    isActive: formData.get("isActive") === "on",
    isProduce: formData.get("isProduce") === "on",
    isFree: formData.get("isFree") === "on",
  };
  if (id) await prisma.category.update({ where: { id }, data });
  else await prisma.category.create({ data });
  revalidatePath("/admin");
}

export async function adminSaveCity(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const data = {
    name: String(formData.get("name")),
    slug: String(formData.get("slug")),
    isActive: formData.get("isActive") === "on",
  };
  if (id) await prisma.city.update({ where: { id }, data });
  else await prisma.city.create({ data });
  revalidatePath("/admin");
}

export async function adminSaveProhibited(formData: FormData) {
  await requireAdmin();
  await prisma.prohibitedItem.create({
    data: { name: String(formData.get("name")), description: String(formData.get("description") || "") },
  });
  revalidatePath("/admin");
}

export async function adminUpdateSettings(formData: FormData) {
  await requireAdmin();
  await prisma.platformSettings.update({
    where: { id: "default" },
    data: {
      commissionPercent: Number(formData.get("commissionPercent") || 12),
      commissionOnDelivery: formData.get("commissionOnDelivery") === "on",
      stripeFeeTreatment: String(formData.get("stripeFeeTreatment") || "CONNECT_DEFAULT") as
        | "DEDUCT_FROM_SELLER"
        | "ABSORB_BY_PLATFORM"
        | "CONNECT_DEFAULT",
      enhancedDescriptionCents: Number(formData.get("enhancedDescriptionCents") || 100),
    },
  });
  revalidatePath("/admin");
}

export async function adminResolveDispute(disputeId: string, notes: string) {
  await requireAdmin();
  await prisma.dispute.update({
    where: { id: disputeId },
    data: { status: "RESOLVED", adminNotes: notes, resolvedAt: new Date() },
  });
  revalidatePath("/admin");
}

/** Manually run the 90-day sold/removed photo purge (listing text stays). */
export async function adminPurgeExpiredImages() {
  await requireAdmin();
  const { purgeExpiredListingImages, IMAGE_RETENTION_DAYS } = await import("@/lib/cleanup-images");
  const result = await purgeExpiredListingImages();
  await prisma.auditLog.create({
    data: {
      action: "PURGE_EXPIRED_IMAGES",
      metadata: result,
    },
  });
  revalidatePath("/admin");
  return { ...result, retentionDays: IMAGE_RETENTION_DAYS };
}
