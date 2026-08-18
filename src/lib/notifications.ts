import { NotificationType } from "@prisma/client";
import { prisma } from "./db";

export async function notify(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
      metadata: input.metadata as object | undefined,
    },
  });
}

export async function notifyFavoritesListingChange(
  listingId: string,
  type: NotificationType,
  title: string,
  body: string,
) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { favorites: true },
  });
  if (!listing) return;
  await prisma.notification.createMany({
    data: listing.favorites.map((fav) => ({
      userId: fav.userId,
      type,
      title,
      body,
      link: `/listing/${listing.slug}`,
    })),
  });
}
