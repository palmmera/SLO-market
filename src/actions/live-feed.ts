"use server";

import { ListingStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { garageSaleIsLive } from "@/lib/garage-live";

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

export async function garageSaleLiveNow(collectionId: string) {
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    select: { liveAt: true, type: true },
  });
  if (!collection || collection.type === "PRODUCE_STAND") return false;
  return garageSaleIsLive(collection.liveAt);
}

export async function setGarageSaleLive(collectionId: string, live: boolean, announce = false) {
  const session = await getSession();
  if (!session?.user?.id) return;
  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, sellerId: session.user.id, type: { not: "PRODUCE_STAND" } },
    select: { id: true, slug: true },
  });
  if (!collection) return;
  await prisma.collection.update({
    where: { id: collection.id },
    data: { liveAt: live ? new Date() : null },
  });
  if (announce) {
    revalidatePath("/");
    revalidatePath("/browse");
    revalidatePath("/garage-sale");
    revalidatePath(`/collection/${collection.slug}`);
  }
}
