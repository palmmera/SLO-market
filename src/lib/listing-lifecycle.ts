import { ListingStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { LISTING_DURATION_DAYS } from "@/lib/constants";
import { notify } from "@/lib/notifications";

/**
 * Expires active listings whose lifespan has elapsed.
 *
 * - Backfills expiresAt for any legacy active listings that predate this
 *   feature (based on publishedAt/createdAt + the configured duration).
 * - Flips still-active-but-past-due listings to EXPIRED (they stay in the DB
 *   as text, drop out of browse/search, and later feed the 90-day image purge).
 * - Notifies each seller (email + in-app) with a link to renew.
 */
export async function expireStaleListings() {
  // Backfill listings created before expiresAt existed.
  await prisma.$executeRawUnsafe(
    `UPDATE "Listing"
       SET "expiresAt" = COALESCE("publishedAt", "createdAt") + make_interval(days => ${LISTING_DURATION_DAYS})
     WHERE "status" = 'ACTIVE' AND "expiresAt" IS NULL`,
  );

  const now = new Date();
  const due = await prisma.listing.findMany({
    where: { status: ListingStatus.ACTIVE, expiresAt: { lte: now } },
    select: { id: true, sellerId: true, title: true, slug: true },
  });

  let expired = 0;
  for (const listing of due) {
    await prisma.listing.update({
      where: { id: listing.id },
      data: { status: ListingStatus.EXPIRED },
    });
    expired += 1;

    await notify({
      userId: listing.sellerId,
      type: "LISTING_EXPIRED",
      title: "Your listing expired",
      body: `“${listing.title}” has reached the end of its ${LISTING_DURATION_DAYS}-day run. Renew it anytime to put it back in front of buyers.`,
      link: "/dashboard",
    }).catch(() => null);
  }

  return { expired };
}
