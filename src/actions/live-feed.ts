"use server";

import { ListingStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export type LiveFeedMessage = {
  id: string;
  body: string;
  senderName: string;
  listingTitle: string;
  createdAt: string;
};

/** Recent buyer and seller messages for items in one garage sale. Newest first. */
export async function getCollectionLiveMessages(collectionId: string): Promise<LiveFeedMessage[]> {
  const listings = await prisma.listing.findMany({
    where: { collectionId, status: { not: ListingStatus.REMOVED } },
    select: { id: true, title: true },
  });
  if (!listings.length) return [];
  const titles = new Map(listings.map((listing) => [listing.id, listing.title]));
  const messages = await prisma.message.findMany({
    where: { listingId: { in: listings.map((listing) => listing.id) } },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: { sender: { select: { name: true } } },
  });
  return messages.map((message) => ({
    id: message.id,
    body: message.body,
    senderName: message.sender.name.trim().split(/\s+/)[0] || "Someone",
    listingTitle: message.listingId ? titles.get(message.listingId) || "" : "",
    createdAt: message.createdAt.toISOString(),
  }));
}
