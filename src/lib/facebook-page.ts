import { ListingStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { absoluteUrl, formatCityCounty, formatMoney, isHousingRentalSlug } from "@/lib/utils";

const GRAPH_VERSION = process.env.FACEBOOK_GRAPH_VERSION || "v22.0";

function pageId() {
  return process.env.FACEBOOK_PAGE_ID?.trim() || "";
}

function pageToken() {
  return process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim() || "";
}

export function facebookPageConfigured() {
  return Boolean(pageId() && pageToken());
}

function publicAssetUrl(path?: string | null) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return absoluteUrl(path);
}

function priceLine(listingType: string, priceCents: number, categorySlug?: string | null) {
  if (listingType === "FREE" || priceCents === 0) return "FREE";
  const money = formatMoney(priceCents);
  if (listingType === "RENTAL") {
    return isHousingRentalSlug(categorySlug) ? `${money}/night` : `${money}/day`;
  }
  return money;
}

type GraphResult = { id?: string; post_id?: string; error?: { message?: string } };

async function graphPost(path: string, params: Record<string, string>) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`);
  const body = new URLSearchParams({ ...params, access_token: pageToken() });
  const res = await fetch(url, { method: "POST", body, signal: AbortSignal.timeout(15_000) });
  const json = (await res.json().catch(() => ({}))) as GraphResult;
  if (!res.ok || json.error?.message) {
    throw new Error(json.error?.message || `Facebook Graph ${res.status}`);
  }
  return json.post_id || json.id || "";
}

async function publishPagePost(input: { message: string; link: string; imageUrl?: string }) {
  if (input.imageUrl) {
    try {
      return await graphPost(`${pageId()}/photos`, {
        url: input.imageUrl,
        caption: `${input.message}\n\n${input.link}`,
        published: "true",
      });
    } catch (err) {
      console.error("[facebook] photo post failed, trying link post", err instanceof Error ? err.message : err);
    }
  }
  return graphPost(`${pageId()}/feed`, {
    message: input.message,
    link: input.link,
  });
}

/** Posts a regular listing to the SLO Marketplace Facebook Page. No-ops if already posted, a draft, or a garage item. */
export async function shareListingOnFacebookPage(listingId: string) {
  if (!facebookPageConfigured()) return;
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      city: true,
      category: true,
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
    },
  });
  if (!listing || listing.status !== ListingStatus.ACTIVE) return;
  if (listing.collectionId || listing.facebookPostId) return;

  const link = absoluteUrl(`/listing/${listing.slug}`);
  const message = [
    "New on SLO Market",
    listing.title,
    `${priceLine(listing.listingType, listing.priceCents, listing.category.slug)} · ${formatCityCounty(listing.city.name)}`,
  ].join("\n");

  const postId = await publishPagePost({
    message,
    link,
    imageUrl: publicAssetUrl(listing.images[0]?.url),
  });
  if (!postId) return;
  await prisma.listing.update({
    where: { id: listing.id },
    data: { facebookPostId: postId },
  });
}

/** One Facebook post per garage / produce photo sale, after the first item is listed. */
export async function shareCollectionOnFacebookPage(collectionId: string) {
  if (!facebookPageConfigured()) return;
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    include: {
      city: true,
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      listings: {
        where: { status: ListingStatus.ACTIVE },
        select: { priceCents: true },
      },
    },
  });
  if (!collection || collection.status !== ListingStatus.ACTIVE) return;
  if (collection.facebookPostId) return;
  if (!collection.listings.length) return;

  const kind = collection.type === "PRODUCE_STAND" ? "produce stand" : "garage sale";
  const prices = collection.listings.map((l) => l.priceCents);
  const lowest = Math.min(...prices);
  const from =
    lowest === 0 ? "Items from FREE" : `Items from ${formatMoney(lowest)}`;
  const link = absoluteUrl(`/collection/${collection.slug}`);
  const photo = collection.images[0];
  const message = [
    `New ${kind} on SLO Market`,
    collection.title,
    `${from} · ${formatCityCounty(collection.city.name)}`,
  ].join("\n");

  const postId = await publishPagePost({
    message,
    link,
    imageUrl: publicAssetUrl(photo?.displayUrl || photo?.originalUrl),
  });
  if (!postId) return;
  await prisma.collection.update({
    where: { id: collection.id },
    data: { facebookPostId: postId },
  });
}

export async function tryShareListingOnFacebook(listingId: string) {
  try {
    await shareListingOnFacebookPage(listingId);
  } catch (err) {
    console.error("[facebook] listing share failed", listingId, err instanceof Error ? err.message : err);
  }
}

export async function tryShareCollectionOnFacebook(collectionId: string) {
  try {
    await shareCollectionOnFacebookPage(collectionId);
  } catch (err) {
    console.error("[facebook] collection share failed", collectionId, err instanceof Error ? err.message : err);
  }
}
