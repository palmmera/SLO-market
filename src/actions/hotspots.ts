"use server";

import { Condition, CollectionType, FulfillmentMethod, ListingStatus, ListingType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { uniqueCollectionSlug, uniqueListingSlug } from "@/lib/slug";
import { saveListingImage } from "@/lib/storage";
import { revalidatePath } from "next/cache";
import { assertFoodSellerForProduce } from "@/actions/food-seller";
import { resolveProduceCategoryId } from "@/lib/food-seller";
import { ProduceProductType } from "@prisma/client";
import { MAX_COLLECTION_PHOTOS } from "@/lib/constants";

function photosFromForm(formData: FormData): File[] {
  const listed = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (listed.length) return listed;
  const single = formData.get("photo");
  if (single instanceof File && single.size) return [single];
  return [];
}

async function currentUser() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Please sign in first.");
  return session.user;
}

export async function createPhotoCollection(formData: FormData) {
  const user = await currentUser();
  const title = String(formData.get("title") || "Garage Sale").trim();
  const cityId = String(formData.get("cityId") || "");
  const categoryId = String(formData.get("categoryId") || "");
  const type = (String(formData.get("type") || "GARAGE_SALE") as CollectionType);
  const photos = photosFromForm(formData).slice(0, MAX_COLLECTION_PHOTOS);
  if (!photos.length) throw new Error("Please upload at least one photo.");
  if (type === "PRODUCE_STAND") await assertFoodSellerForProduce(user.id);
  const city = await prisma.city.findUnique({ where: { id: cityId } });
  if (!city) throw new Error("Choose a city.");
  const saved = await Promise.all(photos.map((photo) => saveListingImage(photo, true)));
  const collection = await prisma.collection.create({
    data: {
      title,
      slug: await uniqueCollectionSlug(title, city.name),
      type,
      sellerId: user.id,
      cityId,
      status: ListingStatus.ACTIVE,
      images: {
        create: saved.map((image, sortOrder) => ({
          originalUrl: image.originalUrl,
          displayUrl: image.url,
          width: image.width,
          height: image.height,
          sortOrder,
        })),
      },
    },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });
  return { collectionId: collection.id, imageId: collection.images[0].id, slug: collection.slug, categoryId };
}

export async function addCollectionImages(collectionId: string, formData: FormData) {
  const user = await currentUser();
  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, sellerId: user.id },
    include: { images: { orderBy: { sortOrder: "asc" }, select: { id: true, sortOrder: true } } },
  });
  if (!collection) throw new Error("Collection not found.");
  if (collection.type === "PRODUCE_STAND") await assertFoodSellerForProduce(user.id);

  const room = MAX_COLLECTION_PHOTOS - collection.images.length;
  if (room <= 0) throw new Error(`You can add up to ${MAX_COLLECTION_PHOTOS} photos.`);
  const photos = photosFromForm(formData).slice(0, room);
  if (!photos.length) throw new Error("Please choose a photo.");

  const startOrder = (collection.images[collection.images.length - 1]?.sortOrder ?? -1) + 1;
  const saved = await Promise.all(photos.map((photo) => saveListingImage(photo, true)));
  const created = await prisma.$transaction(
    saved.map((image, i) =>
      prisma.collectionImage.create({
        data: {
          collectionId: collection.id,
          originalUrl: image.originalUrl,
          displayUrl: image.url,
          width: image.width,
          height: image.height,
          sortOrder: startOrder + i,
        },
      }),
    ),
  );

  revalidatePath(`/collection/${collection.slug}`);
  return {
    images: created.map((image) => ({
      id: image.id,
      imageUrl: image.originalUrl || image.displayUrl || "",
    })),
  };
}

export async function saveHotspotItem(input: {
  collectionId: string;
  imageId: string;
  categoryId: string;
  title: string;
  price: number;
  description: string;
  condition: Condition;
  x: number;
  y: number;
  width: number;
  height: number;
  extra?: Record<string, string>;
  listingId?: string;
  produceProductType?: ProduceProductType;
  permit?: {
    permitType?: string;
    permitNumber?: string;
    permitAgency?: string;
    permitExpiresAt?: string;
  };
}) {
  const user = await currentUser();
  const stripeAccount = await prisma.stripeAccount.findUnique({ where: { userId: user.id } });
  if (!stripeAccount || stripeAccount.status !== "PAYOUTS_ENABLED" || !stripeAccount.payoutsEnabled) {
    return { needsStripeOnboarding: true as const };
  }

  const collection = await prisma.collection.findFirst({
    where: { id: input.collectionId, sellerId: user.id },
    include: { city: true },
  });
  if (!collection) throw new Error("Collection not found.");
  if (collection.type === "PRODUCE_STAND") await assertFoodSellerForProduce(user.id);
  const image = await prisma.collectionImage.findFirst({ where: { id: input.imageId, collectionId: collection.id } });
  if (!image) throw new Error("Photo not found.");

  let categoryId = input.categoryId;
  if (collection.type === "PRODUCE_STAND" && input.produceProductType) {
    const resolved = await resolveProduceCategoryId(input.produceProductType);
    if (resolved) categoryId = resolved;
  }

  const isProduceStand = collection.type === "PRODUCE_STAND";
  const extraDetails =
    isProduceStand && input.produceProductType
      ? {
          produceProductType: input.produceProductType,
          ...(input.permit || {}),
        }
      : undefined;

  const data = {
    title: input.title,
    description: input.description || "See photo.",
    listingType: input.price > 0 ? ListingType.FOR_SALE : ListingType.FREE,
    condition: isProduceStand ? null : input.condition,
    priceCents: Math.round(input.price * 100),
    status: ListingStatus.ACTIVE,
    sellerId: user.id,
    categoryId,
    cityId: collection.cityId,
    fulfillment: collection.fulfillment,
    deliveryFeeCents: collection.deliveryFeeCents,
    deliveryRadiusMiles: collection.deliveryRadiusMiles,
    freeDelivery: collection.fulfillment === FulfillmentMethod.LOCAL_DELIVERY && collection.deliveryFeeCents === 0,
    collectionId: collection.id,
    publishedAt: new Date(),
    seoTitle: `${input.title} in ${collection.city.name} | SLO Market`,
    seoDescription: input.description.slice(0, 155),
    extraDetails,
  };

  const listing = input.listingId
    ? await prisma.listing.update({ where: { id: input.listingId }, data })
    : await prisma.listing.create({
        data: {
          ...data,
          slug: await uniqueListingSlug(input.title, collection.city.name),
          images: {
            create: {
              url: image.displayUrl || image.originalUrl,
              thumbnailUrl: image.displayUrl || image.originalUrl,
              alt: input.title,
            },
          },
        },
      });

  await prisma.listingHotspot.upsert({
    where: { listingId: listing.id },
    update: {
      collectionImageId: image.id,
      x: input.x,
      y: input.y,
      width: input.width,
      height: input.height,
      markerLabel: input.price > 0 ? `$${Math.round(input.price)}` : "FREE",
      brand: input.extra?.brand,
      model: input.extra?.model,
      measurements: input.extra?.measurements,
      age: input.extra?.age,
      features: input.extra?.features,
      defects: input.extra?.defects,
      additionalDetails: input.extra?.additionalDetails,
      pickupNotes: input.extra?.pickupNotes,
    },
    create: {
      listingId: listing.id,
      collectionImageId: image.id,
      x: input.x,
      y: input.y,
      width: input.width,
      height: input.height,
      markerLabel: input.price > 0 ? `$${Math.round(input.price)}` : "FREE",
      brand: input.extra?.brand,
      model: input.extra?.model,
      measurements: input.extra?.measurements,
      age: input.extra?.age,
      features: input.extra?.features,
      defects: input.extra?.defects,
      additionalDetails: input.extra?.additionalDetails,
      pickupNotes: input.extra?.pickupNotes,
    },
  });

  revalidatePath(`/collection/${collection.slug}`);
  return { listingId: listing.id, slug: listing.slug, needsStripeOnboarding: false as const };
}

export async function deleteHotspotItem(listingId: string) {
  const user = await currentUser();
  const listing = await prisma.listing.findFirst({ where: { id: listingId, sellerId: user.id } });
  if (!listing) throw new Error("Item not found.");
  await prisma.listing.update({ where: { id: listingId }, data: { status: ListingStatus.REMOVED } });
}

export async function markHotspotSold(listingId: string) {
  const user = await currentUser();
  const listing = await prisma.listing.findFirst({ where: { id: listingId, sellerId: user.id } });
  if (!listing) throw new Error("Item not found.");
  await prisma.listing.update({ where: { id: listingId }, data: { status: ListingStatus.SOLD, soldAt: new Date() } });
  await prisma.listingHotspot.updateMany({
    where: { listingId },
    data: { markerLabel: "Sold" },
  });
}

export async function removePhotoCollection(collectionId: string) {
  const user = await currentUser();
  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, sellerId: user.id },
  });
  if (!collection) throw new Error("Garage sale not found.");

  await prisma.listing.updateMany({
    where: { collectionId, sellerId: user.id },
    data: { status: ListingStatus.REMOVED },
  });
  await prisma.collection.update({
    where: { id: collectionId },
    data: { status: ListingStatus.REMOVED },
  });

  revalidatePath("/dashboard");
  revalidatePath("/");
  revalidatePath("/browse");
  revalidatePath(`/collection/${collection.slug}`);
  return true;
}

export async function updateCollectionFulfillment(
  collectionId: string,
  fulfillment: FulfillmentMethod,
  hideSold: boolean,
  deliveryFeeCents = 0,
  deliveryRadiusMiles: number | null = null,
) {
  const user = await currentUser();
  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, sellerId: user.id },
  });
  if (!collection) throw new Error("Garage sale not found.");

  const isDelivery = fulfillment === FulfillmentMethod.LOCAL_DELIVERY;
  const feeCents = isDelivery ? Math.max(0, Math.round(deliveryFeeCents)) : 0;
  const radius = isDelivery ? deliveryRadiusMiles : null;

  await prisma.collection.update({
    where: { id: collection.id },
    data: { fulfillment, hideSold, deliveryFeeCents: feeCents, deliveryRadiusMiles: radius },
  });
  await prisma.listing.updateMany({
    where: { collectionId: collection.id, sellerId: user.id },
    data: {
      fulfillment,
      deliveryFeeCents: feeCents,
      deliveryRadiusMiles: radius,
      freeDelivery: isDelivery && feeCents === 0,
    },
  });

  revalidatePath(`/collection/${collection.slug}`);
  revalidatePath("/dashboard");
  return { ok: true as const };
}
