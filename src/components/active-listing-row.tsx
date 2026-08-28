"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { removeListing } from "@/actions/listings";
import { formatMoney, isDailyRentalListing, isHousingRentalSlug } from "@/lib/utils";

export type ActiveListingRowData = {
  id: string;
  slug: string;
  title: string;
  priceCents: number;
  listingType: string;
  expiresAt?: string | null;
  images: { thumbnailUrl: string | null; url: string }[];
  category?: { slug: string } | null;
};

function expiryLabel(expiresAt?: string | null) {
  if (!expiresAt) return null;
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return { text: "Expires today", urgent: true };
  if (days === 1) return { text: "Expires tomorrow", urgent: true };
  return { text: `Expires in ${days} days`, urgent: days <= 5 };
}

export function ActiveListingRow({ listing }: { listing: ActiveListingRowData }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const image = listing.images[0]?.thumbnailUrl || listing.images[0]?.url;
  const free = listing.listingType === "FREE" || listing.priceCents === 0;
  const rental = listing.listingType === "RENTAL";
  const housing = isHousingRentalSlug(listing.category?.slug);
  const daily = isDailyRentalListing(listing.listingType, listing.category?.slug);
  const priceLabel = housing
    ? `${formatMoney(listing.priceCents)}/night`
    : daily
      ? `${formatMoney(listing.priceCents)}/day`
      : rental
        ? `${formatMoney(listing.priceCents)} rental`
        : free
          ? "FREE"
          : formatMoney(listing.priceCents);
  const expiry = expiryLabel(listing.expiresAt);

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
        <p className={`mt-0.5 text-sm font-medium ${free && !rental ? "text-ocean" : "text-muted"}`}>{priceLabel}</p>
        {expiry && (
          <p className={`mt-0.5 text-xs ${expiry.urgent ? "font-semibold text-clay" : "text-muted"}`}>{expiry.text}</p>
        )}
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
