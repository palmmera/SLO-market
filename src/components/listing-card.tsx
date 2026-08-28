import Link from "next/link";
import { formatMoney, formatCityCounty, isDailyRentalListing, isHousingRentalSlug } from "@/lib/utils";

export type ListingCardData = {
  id: string;
  slug: string;
  title: string;
  priceCents: number;
  listingType: string;
  city: { name: string };
  images: { thumbnailUrl: string | null; url: string }[];
  fulfillment?: string;
  freeDelivery?: boolean;
  isFeatured?: boolean;
  category?: { slug: string } | null;
};

export type CollectionCardData = {
  id: string;
  slug: string;
  title: string;
  city: { name: string };
  itemCount: number;
  lowestPriceCents: number | null;
  imageUrl: string | null;
};

export function ListingCard({ listing }: { listing: ListingCardData }) {
  const image = listing.images[0]?.thumbnailUrl || listing.images[0]?.url;
  const service = listing.listingType === "SERVICE";
  const rental = listing.listingType === "RENTAL";
  const housing = rental && isHousingRentalSlug(listing.category?.slug);
  const daily = isDailyRentalListing(listing.listingType, listing.category?.slug);
  const free = !service && !rental && (listing.listingType === "FREE" || listing.priceCents === 0);

  return (
    <Link href={`/listing/${listing.slug}`} className="group overflow-hidden rounded-3xl bg-white card-shadow">
      <div className="relative aspect-[4/3] overflow-hidden bg-sand-dark">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={listing.title} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">No photo yet</div>
        )}
        <div className="absolute left-3 top-3 flex gap-2">
          {listing.isFeatured && <span className="rounded-full bg-gold px-2.5 py-1 text-[11px] font-semibold text-ink">Featured</span>}
          {rental && (
            <span className="rounded-full bg-ocean/90 px-2.5 py-1 text-[11px] font-semibold text-white">
              {housing ? "Room / house" : "Rental"}
            </span>
          )}
          {service && <span className="rounded-full bg-ocean/90 px-2.5 py-1 text-[11px] font-semibold text-white">Service</span>}
        </div>
      </div>
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{listing.title}</h3>
          <div className={`shrink-0 text-right text-sm font-bold ${free ? "text-ocean" : "text-ink"}`}>
            {free ? "FREE" : housing ? `${formatMoney(listing.priceCents)}/night` : daily ? `${formatMoney(listing.priceCents)}/day` : formatMoney(listing.priceCents)}
          </div>
        </div>
        <p className="mt-1 text-xs text-muted">{formatCityCounty(listing.city.name)}</p>
        {housing ? <p className="mt-1 text-[11px] text-ocean">Per night</p> : daily && <p className="mt-1 text-[11px] text-ocean">Per day</p>}
        {listing.fulfillment === "LOCAL_DELIVERY" && (
          <p className="mt-1 text-[11px] text-ocean">{listing.freeDelivery ? "Free local delivery" : "Local delivery available"}</p>
        )}
      </div>
    </Link>
  );
}

export function CollectionCard({ collection }: { collection: CollectionCardData }) {
  const priceLabel =
    collection.itemCount === 0
      ? "No items"
      : collection.lowestPriceCents === 0
        ? "Items from FREE"
        : collection.lowestPriceCents != null
          ? `From ${formatMoney(collection.lowestPriceCents)}`
          : `${collection.itemCount} items`;

  return (
    <Link href={`/collection/${collection.slug}`} className="group overflow-hidden rounded-3xl bg-white card-shadow">
      <div className="relative aspect-[4/3] overflow-hidden bg-sand-dark">
        {collection.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={collection.imageUrl}
            alt={collection.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">No photo yet</div>
        )}
        <div className="absolute left-3 top-3">
          <span className="rounded-full bg-gold px-2.5 py-1 text-[11px] font-semibold text-ink">
            {collection.itemCount} item{collection.itemCount === 1 ? "" : "s"}
          </span>
        </div>
      </div>
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{collection.title}</h3>
          <div className="shrink-0 text-sm font-bold text-ink">{priceLabel}</div>
        </div>
        <p className="mt-1 text-xs text-muted">{formatCityCounty(collection.city.name)}</p>
        <p className="mt-1 text-[11px] text-ocean">Tap items in the photo to buy</p>
      </div>
    </Link>
  );
}

export function ListingGrid({
  listings,
  collections = [],
}: {
  listings: ListingCardData[];
  collections?: CollectionCardData[];
}) {
  if (!listings.length && !collections.length) {
    return <p className="rounded-2xl bg-white p-6 text-sm text-muted">Nothing here yet. Be the first to list something nearby.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {collections.map((collection) => (
        <CollectionCard key={collection.id} collection={collection} />
      ))}
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
