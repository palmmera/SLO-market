"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { renewListing, removeListing } from "@/actions/listings";
import { formatMoney, isDailyRentalListing, isHousingRentalSlug } from "@/lib/utils";

export type ExpiredListingRowData = {
  id: string;
  slug: string;
  title: string;
  priceCents: number;
  listingType: string;
  images: { thumbnailUrl: string | null; url: string }[];
  category?: { slug: string } | null;
};

export function ExpiredListingRow({ listing }: { listing: ExpiredListingRowData }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const image = listing.images[0]?.thumbnailUrl || listing.images[0]?.url;
  const free = listing.listingType === "FREE" || listing.priceCents === 0;
  const rental = listing.listingType === "RENTAL";
  const housing = isHousingRentalSlug(listing.category?.slug);
  const daily = isDailyRentalListing(listing.listingType, listing.category?.slug);
  const priceLabel = housing
    ? `${formatMoney(listing.priceCents)}/mo`
    : daily
      ? `${formatMoney(listing.priceCents)}/day`
      : rental
        ? `${formatMoney(listing.priceCents)} rental`
        : free
          ? "FREE"
          : formatMoney(listing.priceCents);

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-3 card-shadow">
      <Link href={`/listing/${listing.slug}`} className="shrink-0 overflow-hidden rounded-xl bg-sand-dark">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={listing.title} className="h-16 w-16 object-cover opacity-70" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center text-[10px] text-muted">No photo</div>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/listing/${listing.slug}`} className="block truncate font-semibold hover:underline">
          {listing.title}
        </Link>
        <p className="mt-0.5 text-sm text-muted">{priceLabel}</p>
        <p className="mt-0.5 text-xs font-semibold text-clay">Expired — renew to relist</p>
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            start(async () => {
              await renewListing(listing.id);
              router.refresh();
            });
          }}
          className="rounded-full bg-ocean px-3 py-1.5 text-center text-xs font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Renewing…" : "Renew"}
        </button>
        <Link
          href={`/dashboard/listings/${listing.id}/edit`}
          className="rounded-full bg-sand px-3 py-1.5 text-center text-xs font-semibold text-ink"
        >
          Edit
        </Link>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm(`Delete “${listing.title}” for good?`)) return;
            start(async () => {
              await removeListing(listing.id);
              router.refresh();
            });
          }}
          className="rounded-full bg-clay/10 px-3 py-1.5 text-xs font-semibold text-clay disabled:opacity-60"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
