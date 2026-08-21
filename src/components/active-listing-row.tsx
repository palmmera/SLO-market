"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { removeListing } from "@/actions/listings";
import { formatMoney } from "@/lib/utils";

export type ActiveListingRowData = {
  id: string;
  slug: string;
  title: string;
  priceCents: number;
  listingType: string;
  images: { thumbnailUrl: string | null; url: string }[];
};

export function ActiveListingRow({ listing }: { listing: ActiveListingRowData }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const image = listing.images[0]?.thumbnailUrl || listing.images[0]?.url;
  const free = listing.listingType === "FREE" || listing.priceCents === 0;
  const wanted = listing.listingType === "WANTED";
  const priceLabel = wanted ? "Wanted" : free ? "FREE" : formatMoney(listing.priceCents);

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-3 card-shadow">
      <Link href={`/listing/${listing.slug}`} className="shrink-0 overflow-hidden rounded-xl bg-sand-dark">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={listing.title} className="h-16 w-16 object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center text-[10px] text-muted">No photo</div>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/listing/${listing.slug}`} className="block truncate font-semibold hover:underline">
          {listing.title}
        </Link>
        <p className={`mt-0.5 text-sm font-medium ${free && !wanted ? "text-ocean" : "text-muted"}`}>{priceLabel}</p>
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
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
            if (!confirm(`Remove “${listing.title}” from your active listings?`)) return;
            start(async () => {
              await removeListing(listing.id);
              router.refresh();
            });
          }}
          className="rounded-full bg-clay/10 px-3 py-1.5 text-xs font-semibold text-clay disabled:opacity-60"
        >
          {pending ? "Removing…" : "Delete"}
        </button>
      </div>
    </div>
  );
}
