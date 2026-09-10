"use client";

import { useState } from "react";
import { MAX_LISTING_QUANTITY } from "@/lib/utils";

export function QuantityOfferFields({
  listingType,
  defaultQuantity = 1,
  defaultOffersEnabled = false,
  defaultMinOffer = "",
}: {
  listingType: string;
  defaultQuantity?: number;
  defaultOffersEnabled?: boolean;
  defaultMinOffer?: string;
}) {
  const [offersEnabled, setOffersEnabled] = useState(defaultOffersEnabled);
  if (listingType !== "FOR_SALE" && listingType !== "FREE") return null;

  return (
    <div className="mt-4 space-y-3">
      <label className="block">
        <span className="text-sm font-medium">Quantity</span>
        <input
          name="quantity"
          type="number"
          min={1}
          max={MAX_LISTING_QUANTITY}
          defaultValue={defaultQuantity}
          className="mt-2 w-full rounded-2xl border border-sand-dark bg-sand px-4 py-3"
        />
        <span className="mt-1 block text-xs text-muted">How many of this item you have. Buyers can purchase one or more.</span>
      </label>
      {listingType === "FOR_SALE" && (
        <div className="rounded-2xl bg-sand p-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="offersEnabled"
              checked={offersEnabled}
              onChange={(e) => setOffersEnabled(e.target.checked)}
            />
            Allow offers
          </label>
          <p className="mt-1 text-xs text-muted">
            Buyers can suggest a price. Offers below your minimum are declined automatically.
          </p>
          {offersEnabled && (
            <label className="mt-3 block">
              <span className="text-sm font-medium">Minimum offer you’ll accept</span>
              <input
                name="minOffer"
                type="number"
                min="0.01"
                step="0.01"
                required
                defaultValue={defaultMinOffer}
                placeholder="e.g. 40"
                className="mt-2 w-full rounded-2xl border border-sand-dark bg-white px-4 py-3"
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}
