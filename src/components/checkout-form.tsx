"use client";

import { useState, useTransition } from "react";
import { createCheckoutSession } from "@/actions/orders";
import { formatMoney } from "@/lib/utils";

export function CheckoutForm({
  listingId,
  title,
  sellerName,
  itemPriceCents,
  canDeliver,
  freeDelivery,
  deliveryFeeCents,
  deliveryRadius,
  payoutsEnabled,
}: {
  listingId: string;
  title: string;
  sellerName: string;
  itemPriceCents: number;
  canDeliver: boolean;
  freeDelivery: boolean;
  deliveryFeeCents: number;
  deliveryRadius: number | null;
  payoutsEnabled: boolean;
}) {
  const [fulfillment, setFulfillment] = useState<"PICKUP_ONLY" | "LOCAL_DELIVERY">("PICKUP_ONLY");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const delivery = fulfillment === "LOCAL_DELIVERY" && canDeliver ? (freeDelivery ? 0 : deliveryFeeCents) : 0;
  const total = itemPriceCents + delivery;

  return (
    <div className="space-y-4 rounded-3xl bg-white p-5 card-shadow">
      <h1 className="font-display text-3xl">Pay Securely</h1>
      <div className="text-sm">
        <div className="font-semibold">{title}</div>
        <div className="text-muted">Seller: {sellerName}</div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Fulfillment method</p>
        <label className="mb-2 flex items-center gap-2 rounded-2xl bg-sand p-3">
          <input type="radio" checked={fulfillment === "PICKUP_ONLY"} onChange={() => setFulfillment("PICKUP_ONLY")} />
          Pickup Only
        </label>
        {canDeliver && (
          <label className="flex items-center gap-2 rounded-2xl bg-sand p-3">
            <input type="radio" checked={fulfillment === "LOCAL_DELIVERY"} onChange={() => setFulfillment("LOCAL_DELIVERY")} />
            Local delivery {freeDelivery ? "(free)" : `(${formatMoney(deliveryFeeCents)})`}
            {deliveryRadius ? ` · ${deliveryRadius} miles` : ""}
          </label>
        )}
      </div>
      <dl className="space-y-1 text-sm">
        <div className="flex justify-between">
          <dt>Item price</dt>
          <dd>{formatMoney(itemPriceCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Delivery fee</dt>
          <dd>{delivery ? formatMoney(delivery) : "None"}</dd>
        </div>
        <div className="flex justify-between font-semibold">
          <dt>Total</dt>
          <dd>{formatMoney(total)}</dd>
        </div>
      </dl>
      {!payoutsEnabled && (
        <p className="rounded-2xl bg-gold/20 p-3 text-sm">This seller still needs to finish Stripe onboarding before marketplace payments can be collected.</p>
      )}
      {error && <p className="text-sm text-clay">{error}</p>}
      <button
        disabled={pending || !payoutsEnabled}
        onClick={() =>
          start(async () => {
            try {
              const url = await createCheckoutSession(listingId, fulfillment);
              if (url) window.location.href = url;
            } catch (err) {
              setError(err instanceof Error ? err.message : "Checkout failed.");
            }
          })
        }
        className="w-full rounded-2xl bg-ocean py-3.5 font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Redirecting to Stripe..." : "Pay Securely"}
      </button>
    </div>
  );
}
