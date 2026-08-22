"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteDraft } from "@/actions/listings";

export type DraftListingRowData = {
  id: string;
  title: string;
  images: { thumbnailUrl: string | null; url: string }[];
};

export function DraftListingRow({ listing }: { listing: DraftListingRowData }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const image = listing.images[0]?.thumbnailUrl || listing.images[0]?.url;

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-3 card-shadow">
      <Link href={`/dashboard/listings/${listing.id}/edit`} className="shrink-0 overflow-hidden rounded-xl bg-sand-dark">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={listing.title} className="h-16 w-16 object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center text-[10px] text-muted">No photo</div>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/dashboard/listings/${listing.id}/edit`} className="block truncate font-semibold hover:underline">
          {listing.title}
        </Link>
        <p className="mt-0.5 text-xs text-muted">Saved as draft — continue to publish</p>
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
        <Link
          href={`/dashboard/listings/${listing.id}/edit`}
          className="rounded-full bg-sand px-3 py-1.5 text-center text-xs font-semibold text-ink"
        >
          Continue
        </Link>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm(`Delete the draft “${listing.title}”? This cannot be undone.`)) return;
            start(async () => {
              await deleteDraft(listing.id);
              router.refresh();
            });
          }}
          className="rounded-full bg-clay/10 px-3 py-1.5 text-xs font-semibold text-clay disabled:opacity-60"
        >
          {pending ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}
