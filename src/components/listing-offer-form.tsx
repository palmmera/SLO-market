"use client";

import { useState, useTransition } from "react";
import { submitListingOffer } from "@/actions/offers";
import { formatMoney, MAX_LISTING_QUANTITY } from "@/lib/utils";

export function ListingOfferForm({
  listingId,
  askingCents,
  minOfferCents,
  maxQuantity,
}: {
  listingId: string;
  askingCents: number;
  minOfferCents: number;
  maxQuantity: number;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [result, setResult] = useState<"pending" | "declined" | "">("");
  const [quantity, setQuantity] = useState(1);

  return (
    <form
      className="rounded-2xl bg-sand p-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        setResult("");
        const form = new FormData(e.currentTarget);
        start(async () => {
          try {
            const res = await submitListingOffer(listingId, form);
            setResult(res.status);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not send offer.");
          }
        });
      }}
    >
      <p className="text-sm font-semibold">Make an offer</p>
      <p className="mt-1 text-xs text-muted">
        Asking {formatMoney(askingCents)}. Offers below {formatMoney(minOfferCents)} are declined automatically.
      </p>
      <div className={`mt-2 grid gap-2 ${maxQuantity > 1 ? "grid-cols-2" : ""}`}>
        <input
          name="offerAmount"
          type="number"
          min="0.01"
          step="0.01"
          required
          placeholder="Your offer"
          className="w-full rounded-xl bg-white px-3 py-2 text-sm"
        />
        {maxQuantity > 1 && (
          <select
            name="offerQuantity"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full rounded-xl bg-white px-3 py-2 text-sm"
          >
            {Array.from({ length: Math.min(maxQuantity, MAX_LISTING_QUANTITY) }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                Qty {n}
              </option>
            ))}
          </select>
        )}
        {maxQuantity <= 1 && <input type="hidden" name="offerQuantity" value="1" />}
      </div>
      {error && <p className="mt-2 text-sm text-clay">{error}</p>}
      {result === "pending" && (
        <p className="mt-2 text-sm text-ocean">Offer sent. The seller will accept or decline it.</p>
      )}
      {result === "declined" && (
        <p className="mt-2 text-sm text-clay">That offer is below the seller’s minimum, so it was declined.</p>
      )}
      <button disabled={pending} className="mt-2 w-full rounded-xl bg-ink py-2.5 text-sm font-semibold text-white">
        {pending ? "Sending..." : "Send offer"}
      </button>
    </form>
  );
}
