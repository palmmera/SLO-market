"use server";

import { revalidatePath } from "next/cache";
import { Condition, FulfillmentMethod, ListingStatus, ListingType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { uniqueListingSlug } from "@/lib/slug";
import { saveListingImage } from "@/lib/storage";
import { notify, notifyFavoritesListingChange } from "@/lib/notifications";
import { getPlatformSettings } from "@/lib/fees";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { absoluteUrl } from "@/lib/utils";

async function currentUser() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Please sign in first.");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.isSuspended) throw new Error("This account cannot create listings.");
  return user;
}

export async function createListing(formData: FormData) {
  const user = await currentUser();
  const stripeAccount = await prisma.stripeAccount.findUnique({ where: { userId: user.id } });
  const stripeReady =
    Boolean(stripeAccount) && stripeAccount!.status === "PAYOUTS_ENABLED" && Boolean(stripeAccount!.payoutsEnabled);

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const categoryId = String(formData.get("categoryId") || "");
  const cityId = String(formData.get("cityId") || "");
  const listingType = String(formData.get("listingType") || "FOR_SALE") as ListingType;
  const condition = (formData.get("condition") as Condition | null) || null;
  const price = Number(formData.get("price") || 0);
  const fulfillment = (String(formData.get("fulfillment") || "PICKUP_ONLY") as FulfillmentMethod);
  const deliveryRadiusMiles = formData.get("deliveryRadiusMiles") ? Number(formData.get("deliveryRadiusMiles")) : null;
  const deliveryFee = Number(formData.get("deliveryFee") || 0);
  const freeDelivery = formData.get("freeDelivery") === "on";
  const enhanced = formData.get("enhanced") === "1";

  if (!title || !categoryId || !cityId) throw new Error("Title, category, and city are required.");
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  const city = await prisma.city.findUnique({ where: { id: cityId } });
  if (!category || !city) throw new Error("Please choose a valid category and city.");

  const priceCents = listingType === "FREE" ? 0 : Math.round(price * 100);
  const slug = await uniqueListingSlug(title, city.name);
  const seoTitle = `${title} in ${city.name} | SLO Market`;
  const seoDescription = description.slice(0, 155) || `${title} listed in ${city.name}, San Luis Obispo County.`;

  const listing = await prisma.listing.create({
    data: {
      slug,
      title,
      description,
      listingType,
      condition: listingType === "WANTED" ? null : condition,
      priceCents,
      status: stripeReady ? ListingStatus.ACTIVE : ListingStatus.DRAFT,
      sellerId: user.id,
      categoryId,
      cityId,
      fulfillment,
      deliveryRadiusMiles: fulfillment === "LOCAL_DELIVERY" ? deliveryRadiusMiles : null,
      deliveryFeeCents: fulfillment === "LOCAL_DELIVERY" && !freeDelivery ? Math.round(deliveryFee * 100) : 0,
      freeDelivery: fulfillment === "LOCAL_DELIVERY" && (freeDelivery || deliveryFee === 0),
      enhancedDescription: false,
      extraDetails: enhanced
        ? {
            measurements: String(formData.get("measurements") || ""),
            brand: String(formData.get("brand") || ""),
            history: String(formData.get("history") || ""),
            extra: String(formData.get("extra") || ""),
          }
        : undefined,
      seoTitle,
      seoDescription,
      publishedAt: stripeReady ? new Date() : null,
    },
  });

  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 10);
  for (const [index, file] of files.entries()) {
    const saved = await saveListingImage(file);
    await prisma.listingImage.create({
      data: {
        listingId: listing.id,
        url: saved.url,
        thumbnailUrl: saved.thumbnailUrl,
        width: saved.width,
        height: saved.height,
        sortOrder: index,
        alt: title,
      },
    });
  }

  if (!stripeReady) {
    return {
      listingId: listing.id,
      slug: listing.slug,
      needsStripeOnboarding: true as const,
      needsEnhancedPayment: false as const,
    };
  }

  if (enhanced) {
    return {
      listingId: listing.id,
      slug: listing.slug,
      needsEnhancedPayment: true as const,
      needsStripeOnboarding: false as const,
    };
  }

  revalidatePath("/");
  revalidatePath("/browse");
  return {
    listingId: listing.id,
    slug: listing.slug,
    needsEnhancedPayment: false as const,
    needsStripeOnboarding: false as const,
  };
}

export async function startEnhancedDescriptionCheckout(listingId: string) {
  const user = await currentUser();
  const settings = await getPlatformSettings();
  if (!stripeConfigured()) throw new Error("Stripe is not configured for enhanced descriptions.");
  const listing = await prisma.listing.findFirst({ where: { id: listingId, sellerId: user.id } });
  if (!listing) throw new Error("Listing not found.");
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: settings.enhancedDescriptionCents,
          product_data: { name: "Enhanced Description — SLO Market" },
        },
      },
    ],
    metadata: { type: "enhanced_description", listingId, userId: user.id },
    success_url: absoluteUrl(`/listing/${listing.slug}?enhanced=success`),
    cancel_url: absoluteUrl(`/listing/${listing.slug}?enhanced=cancelled`),
  });
  await prisma.enhancedDescriptionPurchase.create({
    data: {
      userId: user.id,
      listingId,
      stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
      amountCents: settings.enhancedDescriptionCents,
      status: "PENDING",
    },
  });
  return session.url;
}

export async function toggleFavorite(listingId: string) {
  const user = await currentUser();
  const existing = await prisma.favorite.findUnique({
    where: { userId_listingId: { userId: user.id, listingId } },
  });
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw new Error("Listing not found.");
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    await prisma.listing.update({ where: { id: listingId }, data: { favoriteCount: { decrement: 1 } } });
    return { favorited: false };
  }
  await prisma.favorite.create({ data: { userId: user.id, listingId } });
  await prisma.listing.update({ where: { id: listingId }, data: { favoriteCount: { increment: 1 } } });
  await notify({
    userId: listing.sellerId,
    type: "LISTING_FAVORITE",
    title: "Someone saved your listing",
    body: `${user.name} added “${listing.title}” to favorites.`,
    link: `/listing/${listing.slug}`,
  });
  return { favorited: true };
}

export async function updateListing(listingId: string, formData: FormData) {
  const user = await currentUser();
  const existing = await prisma.listing.findFirst({
    where: { id: listingId, sellerId: user.id, status: { not: ListingStatus.REMOVED } },
    include: { images: { orderBy: { sortOrder: "asc" } }, city: true },
  });
  if (!existing) throw new Error("Listing not found.");

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const categoryId = String(formData.get("categoryId") || "");
  const cityId = String(formData.get("cityId") || "");
  const listingType = String(formData.get("listingType") || "FOR_SALE") as ListingType;
  const condition = (formData.get("condition") as Condition | null) || null;
  const price = Number(formData.get("price") || 0);
  const fulfillment = String(formData.get("fulfillment") || "PICKUP_ONLY") as FulfillmentMethod;
  const deliveryRadiusMiles = formData.get("deliveryRadiusMiles") ? Number(formData.get("deliveryRadiusMiles")) : null;
  const deliveryFee = Number(formData.get("deliveryFee") || 0);
  const freeDelivery = formData.get("freeDelivery") === "on";

  if (!title || !categoryId || !cityId) throw new Error("Title, category, and city are required.");
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  const city = await prisma.city.findUnique({ where: { id: cityId } });
  if (!category || !city) throw new Error("Please choose a valid category and city.");

  const priceCents = listingType === "FREE" ? 0 : Math.round(price * 100);
  const priceChanged = priceCents !== existing.priceCents;
  const seoTitle = `${title} in ${city.name} | SLO Market`;
  const seoDescription = description.slice(0, 155) || `${title} listed in ${city.name}, San Luis Obispo County.`;

  const stripeAccount = await prisma.stripeAccount.findUnique({ where: { userId: user.id } });
  const stripeReady =
    Boolean(stripeAccount) && stripeAccount!.status === "PAYOUTS_ENABLED" && Boolean(stripeAccount!.payoutsEnabled);
  const shouldPublishDraft = existing.status === ListingStatus.DRAFT && stripeReady;
  const needsStripeOnboarding = existing.status === ListingStatus.DRAFT && !stripeReady;

  const listing = await prisma.listing.update({
    where: { id: listingId },
    data: {
      title,
      description,
      listingType,
      condition: listingType === "WANTED" ? null : condition,
      priceCents,
      categoryId,
      cityId,
      fulfillment,
      deliveryRadiusMiles: fulfillment === "LOCAL_DELIVERY" ? deliveryRadiusMiles : null,
      deliveryFeeCents: fulfillment === "LOCAL_DELIVERY" && !freeDelivery ? Math.round(deliveryFee * 100) : 0,
      freeDelivery: fulfillment === "LOCAL_DELIVERY" && (freeDelivery || deliveryFee === 0),
      seoTitle,
      seoDescription,
      ...(shouldPublishDraft
        ? { status: ListingStatus.ACTIVE, publishedAt: existing.publishedAt ?? new Date() }
        : {}),
    },
  });

  const removeImageIds = formData.getAll("removeImageIds").map(String).filter(Boolean);
  if (removeImageIds.length) {
    await prisma.listingImage.deleteMany({
      where: { listingId, id: { in: removeImageIds } },
    });
  }

  const remaining = await prisma.listingImage.count({ where: { listingId } });
  const files = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, Math.max(0, 10 - remaining));
  for (const [index, file] of files.entries()) {
    const saved = await saveListingImage(file);
    await prisma.listingImage.create({
      data: {
        listingId,
        url: saved.url,
        thumbnailUrl: saved.thumbnailUrl,
        width: saved.width,
        height: saved.height,
        sortOrder: remaining + index,
        alt: title,
      },
    });
  }

  if (priceChanged && listing.status === ListingStatus.ACTIVE) {
    await notifyFavoritesListingChange(listingId, "PRICE_CHANGE", "Price update", `${listing.title} now costs a different amount.`);
  }

  if (needsStripeOnboarding) {
    return { listingId: listing.id, slug: listing.slug, needsStripeOnboarding: true as const };
  }

  revalidatePath("/");
  revalidatePath("/browse");
  revalidatePath("/dashboard");
  revalidatePath(`/listing/${listing.slug}`);
  return { listingId: listing.id, slug: listing.slug, needsStripeOnboarding: false as const };
}

export async function updateListingPrice(listingId: string, priceCents: number) {
  const user = await currentUser();
  const listing = await prisma.listing.findFirst({ where: { id: listingId, sellerId: user.id } });
  if (!listing) throw new Error("Listing not found.");
  await prisma.listing.update({ where: { id: listingId }, data: { priceCents } });
  await notifyFavoritesListingChange(listingId, "PRICE_CHANGE", "Price update", `${listing.title} now costs a different amount.`);
}

export async function markListingSold(listingId: string) {
  const user = await currentUser();
  const listing = await prisma.listing.findFirst({ where: { id: listingId, sellerId: user.id } });
  if (!listing) throw new Error("Listing not found.");
  await prisma.listing.update({
    where: { id: listingId },
    data: { status: ListingStatus.SOLD, soldAt: new Date() },
  });
  await notifyFavoritesListingChange(listingId, "LISTING_SOLD", "Listing sold", `${listing.title} was marked as sold.`);
}

export async function removeListing(listingId: string) {
  const user = await currentUser();
  const listing = await prisma.listing.findFirst({ where: { id: listingId, sellerId: user.id } });
  if (!listing && user.role !== "ADMIN") throw new Error("Listing not found.");
  await prisma.listing.update({ where: { id: listingId }, data: { status: ListingStatus.REMOVED } });
  await notifyFavoritesListingChange(listingId, "LISTING_REMOVED", "Listing removed", `${listing?.title ?? "A saved listing"} was removed.`);
  revalidatePath("/dashboard");
  revalidatePath("/");
  revalidatePath("/browse");
  if (listing?.slug) revalidatePath(`/listing/${listing.slug}`);
}

export async function startMessage(listingId: string, body: string) {
  const user = await currentUser();
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw new Error("Listing not found.");
  if (listing.sellerId === user.id) throw new Error("You cannot message yourself.");
  let conversation = await prisma.conversation.findFirst({
    where: { listingId, buyerId: user.id, sellerId: listing.sellerId },
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { listingId, buyerId: user.id, sellerId: listing.sellerId },
    });
  }
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: user.id,
      body,
      listingId,
    },
  });
  await prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });
  await notify({
    userId: listing.sellerId,
    type: "NEW_MESSAGE",
    title: "New message",
    body: `${user.name}: ${body.slice(0, 80)}`,
    link: `/messages/${conversation.id}`,
  });
  return conversation.id;
}

export async function sendMessage(conversationId: string, body: string) {
  const user = await currentUser();
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation || (conversation.buyerId !== user.id && conversation.sellerId !== user.id)) {
    throw new Error("Conversation not found.");
  }
  await prisma.message.create({
    data: { conversationId, senderId: user.id, body, listingId: conversation.listingId, orderId: conversation.orderId },
  });
  await prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } });
  const otherId = conversation.buyerId === user.id ? conversation.sellerId : conversation.buyerId;
  await notify({
    userId: otherId,
    type: "NEW_MESSAGE",
    title: "New message",
    body: `${user.name}: ${body.slice(0, 80)}`,
    link: `/messages/${conversationId}`,
  });
}

export async function deleteConversation(conversationId: string) {
  const user = await currentUser();
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation || (conversation.buyerId !== user.id && conversation.sellerId !== user.id)) {
    throw new Error("Conversation not found.");
  }
  await prisma.conversation.delete({ where: { id: conversationId } });
  revalidatePath("/messages");
}

export async function reportContent(formData: FormData) {
  const user = await currentUser();
  await prisma.report.create({
    data: {
      reporterId: user.id,
      targetType: String(formData.get("targetType") || "LISTING") as "LISTING" | "USER" | "REVIEW",
      listingId: (formData.get("listingId") as string) || null,
      userId: (formData.get("userId") as string) || null,
      reviewId: (formData.get("reviewId") as string) || null,
      reason: String(formData.get("reason") || "OTHER") as "SPAM" | "PROHIBITED" | "FRAUD" | "INAPPROPRIATE" | "OTHER",
      details: String(formData.get("details") || ""),
    },
  });
}

export async function blockUser(userId: string) {
  const user = await currentUser();
  if (user.id === userId) throw new Error("You cannot block yourself.");
  await prisma.userBlock.upsert({
    where: { blockerId_blockedId: { blockerId: user.id, blockedId: userId } },
    update: {},
    create: { blockerId: user.id, blockedId: userId },
  });
}
