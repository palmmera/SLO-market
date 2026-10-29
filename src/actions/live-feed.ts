"use server";

import { ListingStatus, ListingType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { garageSaleIsLive } from "@/lib/garage-live";
import { toCollectionCards } from "@/lib/garage-cards";
import { getLiveGarageSales } from "@/lib/listings";
import { makeSlug } from "@/lib/slug";
import { startMessage } from "@/actions/listings";

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
    select: { id: true, title: true, extraDetails: true },
  });
  if (!listings.length) return [];
  const titles = new Map(
    listings.map((listing) => {
      const details = listing.extraDetails as { saleChat?: boolean } | null;
      return [listing.id, details?.saleChat ? "" : listing.title];
    }),
  );
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

/** A hidden draft listing so buyers can message a sale that has no priced tags yet. */
async function saleChatListing(collectionId: string) {
  const existing = await prisma.listing.findFirst({
    where: { collectionId, extraDetails: { path: ["saleChat"], equals: true } },
  });
  if (existing) return existing;

  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    include: { city: true },
  });
  if (!collection || collection.status === ListingStatus.REMOVED) throw new Error("Sale not found.");
  const category =
    (await prisma.category.findFirst({ where: { slug: "garage-sale", isActive: true } })) ||
    (await prisma.category.findFirst({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }));
  if (!category) throw new Error("Could not start a message.");

  return prisma.listing.create({
    data: {
      slug: makeSlug(`${collection.title} messages`),
      title: collection.title,
      description: "Questions about this sale.",
      listingType: ListingType.FREE,
      priceCents: 0,
      status: ListingStatus.DRAFT,
      sellerId: collection.sellerId,
      categoryId: category.id,
      cityId: collection.cityId,
      fulfillment: collection.fulfillment,
      paymentMethod: collection.paymentMethod,
      collectionId: collection.id,
      extraDetails: { saleChat: true },
    },
  });
}

/** Message the seller about this sale. An item id is optional. */
export async function messageGarageSale(collectionId: string, body: string, listingId?: string) {
  const text = body.trim();
  if (!text) throw new Error("Write a message first.");
  if (text.length > 1000) throw new Error("That message is too long.");

  const session = await getSession();
  if (!session?.user?.id) throw new Error("Sign in to message the seller.");
  const collection = await prisma.collection.findUnique({ where: { id: collectionId }, select: { sellerId: true, status: true } });
  if (!collection || collection.status === ListingStatus.REMOVED) throw new Error("Sale not found.");
  if (collection.sellerId === session.user.id) {
    throw new Error("This is your sale. A buyer uses this box to message you.");
  }

  let targetId = listingId || "";
  if (targetId) {
    const item = await prisma.listing.findFirst({
      where: { id: targetId, collectionId, status: ListingStatus.ACTIVE },
      select: { id: true },
    });
    if (!item) targetId = "";
  }
  if (!targetId) targetId = (await saleChatListing(collectionId)).id;
  return startMessage(targetId, text);
}

/** Live garage sales for the front page. Empty when nobody's camera is on. */
export async function getFrontPageLiveGarageSales() {
  const rows = await getLiveGarageSales(8);
  return toCollectionCards(rows);
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
