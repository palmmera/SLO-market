"use server";

import { ListingStatus, OfferStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { notify } from "@/lib/notifications";
import { formatMoney, parseListingQuantity } from "@/lib/utils";

async function currentUser() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Please sign in first.");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.isSuspended) throw new Error("This account cannot make offers.");
  return user;
}

function revalidateListing(slug: string) {
  revalidatePath(`/listing/${slug}`);
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
}

export async function submitListingOffer(listingId: string, formData: FormData) {
  const buyer = await currentUser();
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.status !== ListingStatus.ACTIVE) throw new Error("This listing is no longer available.");
  if (listing.sellerId === buyer.id) throw new Error("You cannot offer on your own listing.");
  if (listing.collectionId) throw new Error("Offers are for regular listings only.");
  if (listing.listingType !== "FOR_SALE" || listing.priceCents <= 0) throw new Error("This listing does not accept offers.");
  if (!listing.offersEnabled || !listing.minOfferCents) throw new Error("The seller is not accepting offers on this listing.");

  const amountCents = Math.round(Number(formData.get("offerAmount") || 0) * 100);
  const quantity = parseListingQuantity(formData.get("offerQuantity"), "FOR_SALE");
  if (!(amountCents > 0)) throw new Error("Enter an offer amount.");
  if (amountCents > listing.priceCents) throw new Error("Your offer can’t be higher than the asking price. Use Buy Now instead.");
  if (quantity > listing.quantity) throw new Error("There aren’t that many available.");

  const belowMin = amountCents < listing.minOfferCents;
  const existing = await prisma.listingOffer.findFirst({
    where: { listingId, buyerId: buyer.id, status: OfferStatus.PENDING },
  });

  const offer = existing
    ? await prisma.listingOffer.update({
        where: { id: existing.id },
        data: {
          amountCents,
          quantity,
          status: belowMin ? OfferStatus.DECLINED : OfferStatus.PENDING,
          autoDeclined: belowMin,
          respondedAt: belowMin ? new Date() : null,
        },
      })
    : await prisma.listingOffer.create({
        data: {
          listingId,
          buyerId: buyer.id,
          sellerId: listing.sellerId,
          amountCents,
          quantity,
          status: belowMin ? OfferStatus.DECLINED : OfferStatus.PENDING,
          autoDeclined: belowMin,
          respondedAt: belowMin ? new Date() : null,
        },
      });

  if (belowMin) {
    await notify({
      userId: buyer.id,
      type: "OFFER_DECLINED",
      title: "Offer declined",
      body: `Your offer of ${formatMoney(amountCents)} on “${listing.title}” was below the seller’s minimum and was declined automatically.`,
      link: `/listing/${listing.slug}`,
    });
    revalidateListing(listing.slug);
    return { status: "declined" as const, offerId: offer.id };
  }

  await notify({
    userId: listing.sellerId,
    type: "OFFER_RECEIVED",
    title: "New offer",
    body: `${buyer.name} offered ${formatMoney(amountCents)}${quantity > 1 ? ` each for ${quantity}` : ""} on “${listing.title}”.`,
    link: "/dashboard",
  });
  revalidateListing(listing.slug);
  return { status: "pending" as const, offerId: offer.id };
}

export async function respondToListingOffer(offerId: string, accept: boolean) {
  const seller = await currentUser();
  const offer = await prisma.listingOffer.findUnique({
    where: { id: offerId },
    include: { listing: true, buyer: { select: { name: true } } },
  });
  if (!offer || offer.sellerId !== seller.id) throw new Error("Offer not found.");
  if (offer.status !== OfferStatus.PENDING) throw new Error("This offer was already answered.");
  if (accept && offer.listing.status !== ListingStatus.ACTIVE) throw new Error("This listing is no longer available.");
  if (accept && offer.quantity > offer.listing.quantity) throw new Error("There aren’t enough left to accept this offer.");
  if (accept) {
    const reserved = await prisma.listingOffer.aggregate({
      where: { listingId: offer.listingId, status: OfferStatus.ACCEPTED, id: { not: offer.id } },
      _sum: { quantity: true },
    });
    if ((reserved._sum.quantity || 0) + offer.quantity > offer.listing.quantity) {
      throw new Error("You already have accepted offers that cover the remaining quantity.");
    }
  }

  await prisma.listingOffer.update({
    where: { id: offerId },
    data: {
      status: accept ? OfferStatus.ACCEPTED : OfferStatus.DECLINED,
      autoDeclined: false,
      respondedAt: new Date(),
    },
  });

  await notify({
    userId: offer.buyerId,
    type: accept ? "OFFER_ACCEPTED" : "OFFER_DECLINED",
    title: accept ? "Offer accepted" : "Offer declined",
    body: accept
      ? `${seller.name} accepted your offer of ${formatMoney(offer.amountCents)} on “${offer.listing.title}”. Pay through checkout to complete the purchase.`
      : `${seller.name} declined your offer on “${offer.listing.title}”.`,
    link: accept ? `/checkout/${offer.listingId}?offer=${offer.id}` : `/listing/${offer.listing.slug}`,
  });
  revalidateListing(offer.listing.slug);
}
