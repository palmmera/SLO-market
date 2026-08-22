import { unlink } from "fs/promises";
import path from "path";
import { ListingStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getUploadRoot } from "@/lib/storage";

/** After this many days, sold/removed/expired listings keep text but lose photo files. */
export const IMAGE_RETENTION_DAYS = 90;

export function uploadUrlToAbsolute(url: string | null | undefined): string | null {
  if (!url) return null;
  const normalized = url.replace(/\\/g, "/");
  const marker = "/uploads/";
  const idx = normalized.indexOf(marker);
  if (idx === -1) return null;
  const relative = normalized.slice(idx + marker.length);
  if (!relative || relative.includes("..")) return null;
  return path.join(getUploadRoot(), ...relative.split("/").filter(Boolean));
}

export async function tryDeleteFile(filePath: string | null) {
  if (!filePath) return false;
  try {
    await unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

/** Best-effort removal of the physical files for a set of listing images. */
export async function deleteListingImageFiles(
  images: { url: string; thumbnailUrl: string | null }[],
) {
  for (const image of images) {
    await tryDeleteFile(uploadUrlToAbsolute(image.url));
    if (image.thumbnailUrl && image.thumbnailUrl !== image.url) {
      await tryDeleteFile(uploadUrlToAbsolute(image.thumbnailUrl));
    }
    const displayPath = uploadUrlToAbsolute(image.url);
    if (displayPath) {
      const originalPath = displayPath.replace(/\.jpg$/i, "-original.jpg");
      if (originalPath !== displayPath) await tryDeleteFile(originalPath);
    }
  }
}

/**
 * Deletes photo files (and DB image rows) for sold/removed/expired listings
 * older than IMAGE_RETENTION_DAYS. Listing title/description stay.
 */
export async function purgeExpiredListingImages() {
  const cutoff = new Date(Date.now() - IMAGE_RETENTION_DAYS * 86_400_000);

  const listings = await prisma.listing.findMany({
    where: {
      status: { in: [ListingStatus.SOLD, ListingStatus.REMOVED, ListingStatus.EXPIRED] },
      images: { some: {} },
      OR: [
        { soldAt: { lte: cutoff } },
        { AND: [{ soldAt: null }, { updatedAt: { lte: cutoff } }] },
      ],
    },
    select: {
      id: true,
      images: { select: { id: true, url: true, thumbnailUrl: true } },
    },
  });

  let filesDeleted = 0;
  let listingsCleared = 0;

  for (const listing of listings) {
    for (const image of listing.images) {
      if (await tryDeleteFile(uploadUrlToAbsolute(image.url))) filesDeleted += 1;
      if (image.thumbnailUrl && image.thumbnailUrl !== image.url) {
        if (await tryDeleteFile(uploadUrlToAbsolute(image.thumbnailUrl))) filesDeleted += 1;
      }
      // Hotspot originals sometimes stored as sibling *-original.jpg
      const displayPath = uploadUrlToAbsolute(image.url);
      if (displayPath) {
        const originalPath = displayPath.replace(/\.jpg$/i, "-original.jpg");
        if (originalPath !== displayPath && (await tryDeleteFile(originalPath))) filesDeleted += 1;
      }
    }

    await prisma.listingImage.deleteMany({ where: { listingId: listing.id } });
    listingsCleared += 1;
  }

  return {
    listingsCleared,
    filesDeleted,
    cutoff,
    retentionDays: IMAGE_RETENTION_DAYS,
  };
}
