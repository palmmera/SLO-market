import { NotificationType } from "@prisma/client";
import { prisma } from "./db";
import { emailConfigured, sendEmail } from "./email";

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

  // Also send a transactional email for these direct, high-value events.
  // No-ops safely if email isn't configured, and never blocks the notification.
  if (emailConfigured()) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { email: true },
      });
      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: input.title,
          heading: input.title,
          body: input.body,
          link: input.link,
          linkLabel: "View on SLO Market",
        });
      }
    } catch (err) {
      console.error("notify email error:", err);
    }
  }
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
