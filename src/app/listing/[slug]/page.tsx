import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { conditionLabel, formatCityCounty, formatDateLabel, formatMoney, initials, isDailyRentalListing, isHousingRentalSlug, isPayableListingType, parseDepositNote } from "@/lib/utils";
import { Gallery, ListingActions } from "@/components/listing-actions";
import { MARKETPLACE_DISCLAIMER } from "@/lib/constants";
import { InteractivePhotoViewer } from "@/components/hotspot/viewer";
import { RentalDepositNote } from "@/components/rental-deposit-note";
import { calculateFees, getPlatformSettings } from "@/lib/fees";
import { ListingStatus } from "@prisma/client";
import { getBookedRentalRanges, rentalAvailability } from "@/lib/rental-availability";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const listing = await prisma.listing.findUnique({
    where: { slug: (await params).slug },
    include: { city: true, images: { take: 1 } },
  });
  if (!listing) return { title: "Listing" };
  return {
    title: listing.seoTitle || listing.title,
    description: listing.seoDescription || listing.description.slice(0, 155),
    openGraph: {
      title: listing.title,
      description: listing.seoDescription || undefined,
      images: listing.images[0] ? [listing.images[0].url] : undefined,
    },
  };
}

export default async function ListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ enhanced?: string }>;
}) {
  const { slug } = await params;
  const listing = await prisma.listing.findUnique({
    where: { slug },
    include: {
      city: true,
      category: { include: { parent: true } },
      images: { orderBy: { sortOrder: "asc" } },
      seller: { include: { city: true, reviewsReceived: { where: { isHidden: false } } } },
      hotspot: { include: { collectionImage: true } },
      collection: { include: { images: { include: { hotspots: { include: { listing: { include: { city: true } } } } } } } },
    },
  });
  if (!listing || listing.status === ListingStatus.REMOVED) notFound();

  // Garage-sale child items open on the shared collection page (one photo, selectable items).
  if (listing.collectionId && listing.collection?.slug) {
    redirect(`/collection/${listing.collection.slug}?item=${listing.slug}`);
  }

  await prisma.listing.update({ where: { id: listing.id }, data: { viewCount: { increment: 1 } } });

  const session = await getSession();
  const settings = await getPlatformSettings();
  const favorited = session?.user?.id
    ? Boolean(await prisma.favorite.findUnique({ where: { userId_listingId: { userId: session.user.id, listingId: listing.id } } }))
    : false;
  const avg =
    listing.seller.reviewsReceived.length === 0
      ? null
      : listing.seller.reviewsReceived.reduce((sum, r) => sum + r.rating, 0) / listing.seller.reviewsReceived.length;

  const extra = (listing.extraDetails as Record<string, string> | null) || {};
  const depositNote = listing.listingType === "RENTAL" ? parseDepositNote(listing.extraDetails) : "";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: listing.description,
    image: listing.images.map((i) => i.url),
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: (listing.priceCents / 100).toFixed(2),
      availability: listing.status === "ACTIVE" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
    },
  };

  const fees = calculateFees({
    itemPriceCents: listing.priceCents,
    deliveryFeeCents: listing.fulfillment === "LOCAL_DELIVERY" ? listing.deliveryFeeCents : 0,
    commissionPercent: settings.commissionPercent,
    commissionOnDelivery: settings.commissionOnDelivery,
    stripeFeeTreatment: settings.stripeFeeTreatment,
    deliveryFeeGoesTo: settings.deliveryFeeGoesTo,
  });

  const canBuy = listing.status === "ACTIVE" && isPayableListingType(listing.listingType) && listing.priceCents > 0;
  const housingRental = listing.listingType === "RENTAL" && isHousingRentalSlug(listing.category.slug);
  const dailyRental = isDailyRentalListing(listing.listingType, listing.category.slug);
  const bookedRanges = dailyRental ? await getBookedRentalRanges(listing.id) : [];
  const availability = dailyRental ? rentalAvailability(bookedRanges) : null;
  const sp = await searchParams;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {sp.enhanced === "success" && (
        <p className="mb-4 rounded-2xl bg-ocean-light px-4 py-3 text-sm">Enhanced description unlocked.</p>
      )}
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          {listing.collection?.images[0] ? (
            <InteractivePhotoViewer
              imageUrl={listing.collection.images[0].originalUrl || listing.collection.images[0].displayUrl || ""}
              items={listing.collection.images[0].hotspots.map((h) => ({
                id: h.listing.id,
                slug: h.listing.slug,
                title: h.listing.title,
                priceCents: h.listing.priceCents,
                description: h.listing.description,
                status: h.listing.status,
                x: h.x,
                y: h.y,
                width: h.width,
                height: h.height,
                markerLabel: h.markerLabel,
              }))}
            />
          ) : (
            <Gallery images={listing.images} title={listing.title} />
          )}
        </div>
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.2em] text-ocean">
            {listing.category.parent?.name || listing.category.name} · {formatCityCounty(listing.city.name)}
          </p>
          <h1 className="font-display text-4xl">{listing.title}</h1>
          <div className="text-3xl font-bold text-ocean">
            {listing.listingType === "FREE" || listing.priceCents === 0
              ? "FREE"
              : dailyRental
                ? `${formatMoney(listing.priceCents)}/day`
                : formatMoney(listing.priceCents)}
          </div>
          {dailyRental && listing.priceCents > 0 && (
            <p className="text-sm text-muted">
              {housingRental
                ? "Price is per night. Pick check-in and check-out — you pay nights × daily rate."
                : "Price is per day. Pick pickup and return dates — you pay days × daily rate."}
            </p>
          )}
          {availability?.current && (
            <p className="rounded-2xl bg-gold/20 px-4 py-3 text-sm">
              Currently rented through {formatDateLabel(availability.current.endDate)}. Next available{" "}
              <strong>{formatDateLabel(availability.nextStart)}</strong>.
            </p>
          )}
          {listing.status !== "ACTIVE" && (
            <p className="font-semibold text-clay">
              {listing.status === "SOLD"
                ? "Sold"
                : listing.status === "EXPIRED"
                  ? "This listing has expired"
                  : listing.status}
            </p>
          )}
          {listing.condition && <p className="text-sm">Condition: {conditionLabel(listing.condition)}</p>}
          <p className="rounded-2xl bg-white p-3 text-sm card-shadow">
            {listing.listingType === "SERVICE"
              ? "Local service — message the provider to arrange details, scheduling, and payment."
              : housingRental
                ? "Booked and paid per night through SLO Market. Arrange check-in and keys with the owner in Messages. Exact address is not shown."
              : listing.listingType === "RENTAL" && listing.fulfillment === "PICKUP_ONLY"
                ? "Pickup / return locally — arrange a public meetup after payment. Exact address is not shown."
                : listing.fulfillment === "PICKUP_ONLY"
                ? "Pickup Only — arrange a public meetup after purchase. Exact address is not shown."
                : listing.freeDelivery
                  ? `Free local delivery within ${listing.deliveryRadiusMiles ?? 10} miles`
                  : `Local delivery: ${formatMoney(listing.deliveryFeeCents)} within ${listing.deliveryRadiusMiles ?? 10} miles`}
          </p>
          <RentalDepositNote note={depositNote} />
          {canBuy && listing.fulfillment === "LOCAL_DELIVERY" && !listing.freeDelivery && !dailyRental && (
            <p className="text-sm text-muted">
              Item {formatMoney(listing.priceCents)} + delivery {formatMoney(listing.deliveryFeeCents)} ={" "}
              <strong>{formatMoney(fees.totalCents)}</strong> before Stripe processing.
            </p>
          )}
          <ListingActions
            listingId={listing.id}
            sellerId={listing.sellerId}
            sellerName={listing.seller.name}
            canBuy={canBuy}
            buyLabel={dailyRental ? "Rent Now" : "Buy Now"}
            favorited={favorited}
            isOwner={session?.user?.id === listing.sellerId}
            dailyRental={dailyRental}
            dailyRateCents={listing.priceCents}
            bookedRanges={bookedRanges}
          />
          <Link href={`/u/${listing.seller.id}`} className="flex items-center gap-3 rounded-2xl bg-white p-3 card-shadow">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-ocean-light font-semibold text-ocean">
              {listing.seller.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={listing.seller.image} alt="" className="h-full w-full object-cover" />
              ) : (
                initials(listing.seller.name)
              )}
            </div>
            <div>
              <div className="font-semibold">{listing.seller.name}</div>
              <div className="text-xs text-muted">
                {listing.seller.city?.name} · Member since {listing.seller.createdAt.getFullYear()}
                {avg ? ` · ${avg.toFixed(1)}★` : ""}
              </div>
            </div>
          </Link>
        </div>
      </div>
      <section className="mt-8 rounded-3xl bg-white p-6 card-shadow">
        <h2 className="font-display text-2xl">Description</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{listing.description}</p>
        {listing.enhancedDescription && (
          <div className="mt-4 grid gap-2 text-sm">
            {extra.brand && <p>Brand: {extra.brand}</p>}
            {extra.measurements && <p>Measurements: {extra.measurements}</p>}
            {extra.history && <p>{extra.history}</p>}
            {extra.extra && <p>{extra.extra}</p>}
          </div>
        )}
        {listing.hotspot && (
          <div className="mt-4 grid gap-1 text-sm">
            {listing.hotspot.brand && <p>Brand: {listing.hotspot.brand}</p>}
            {listing.hotspot.model && <p>Model: {listing.hotspot.model}</p>}
            {listing.hotspot.measurements && <p>Measurements: {listing.hotspot.measurements}</p>}
            {listing.hotspot.age && <p>Age: {listing.hotspot.age}</p>}
            {listing.hotspot.features && <p>Features: {listing.hotspot.features}</p>}
            {listing.hotspot.defects && <p>Defects: {listing.hotspot.defects}</p>}
            {listing.hotspot.additionalDetails && <p>{listing.hotspot.additionalDetails}</p>}
          </div>
        )}
      </section>
      <p className="mt-6 text-xs text-muted">{MARKETPLACE_DISCLAIMER}</p>
    </div>
  );
}
