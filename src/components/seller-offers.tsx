"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { respondToListingOffer } from "@/actions/offers";
import { formatMoney } from "@/lib/utils";

export type SellerOfferRow = {
  id: string;
  amountCents: number;
  quantity: number;
  createdAt: string;
  listingTitle: string;
  listingSlug: string;
  buyerName: string;
};

export function SellerOffers({ offers }: { offers: SellerOfferRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  if (!offers.length) return null;

  function answer(offerId: string, accept: boolean) {
    setError("");
    start(async () => {
      try {
        await respondToListingOffer(offerId, accept);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update that offer.");
      }
    });
  }

  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-2xl">Offers</h2>
      {error && <p className="mb-2 text-sm text-clay">{error}</p>}
      <div className="grid gap-2">
        {offers.map((offer) => (
          <div key={offer.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 card-shadow">
            <div className="min-w-0">
              <p className="font-semibold">
                {formatMoney(offer.amountCents)}
                {offer.quantity > 1 ? ` × ${offer.quantity}` : ""} on {offer.listingTitle}
              </p>
              <p className="text-xs text-muted">
                {offer.buyerName} · {new Date(offer.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => answer(offer.id, true)}
                className="rounded-full bg-ocean px-3 py-1.5 text-xs font-semibold text-white"
              >
                Accept
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => answer(offer.id, false)}
                className="rounded-full bg-clay/10 px-3 py-1.5 text-xs font-semibold text-clay"
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
