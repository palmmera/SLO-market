"use client";

import { useState, useTransition } from "react";
import { createCheckoutSession } from "@/actions/orders";
import { formatMoney, MAX_DAILY_RENTAL_DAYS, overlappingBookedRange, rentalDaysInclusive, type RentalDateRangeValue } from "@/lib/utils";
import { RentalDateRange } from "@/components/rental-date-range";

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
  housingRental = false,
  dailyRental = false,
  initialStartDate = "",
  initialEndDate = "",
  bookedRanges = [],
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
  housingRental?: boolean;
  dailyRental?: boolean;
  initialStartDate?: string;
  initialEndDate?: string;
  bookedRanges?: RentalDateRangeValue[];
}) {
  const [fulfillment, setFulfillment] = useState<"PICKUP_ONLY" | "LOCAL_DELIVERY">("PICKUP_ONLY");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [rentalStart, setRentalStart] = useState(initialStartDate);
  const [rentalEnd, setRentalEnd] = useState(initialEndDate);
  const rentalDays = dailyRental && rentalStart && rentalEnd ? rentalDaysInclusive(rentalStart, rentalEnd) : 0;
  const overlap = dailyRental ? overlappingBookedRange(rentalStart, rentalEnd, bookedRanges) : null;
  const rentalTotal = dailyRental ? rentalDays * itemPriceCents : itemPriceCents;
  const delivery = fulfillment === "LOCAL_DELIVERY" && canDeliver ? (freeDelivery ? 0 : deliveryFeeCents) : 0;
  const total = rentalTotal + delivery;
  const canPay = payoutsEnabled && (!dailyRental || (rentalDays > 0 && rentalDays <= MAX_DAILY_RENTAL_DAYS && !overlap));

  return (
    <div className="space-y-4 rounded-3xl bg-white p-5 card-shadow">
      <h1 className="font-display text-3xl">{dailyRental ? "Rent" : "Pay Securely"}</h1>
      <div className="text-sm">
        <div className="font-semibold">{title}</div>
        <div className="text-muted">Seller: {sellerName}</div>
      </div>
      {housingRental && (
        <p className="rounded-2xl bg-sand p-3 text-sm">
          Pick your check-in and check-out dates. You pay the daily rate × number of nights up front. Arrange the rest with the owner in Messages.
        </p>
      )}
      {dailyRental && (
        <RentalDateRange
          dailyRateCents={itemPriceCents}
          startDate={rentalStart}
          endDate={rentalEnd}
          bookedRanges={bookedRanges}
          onChange={({ startDate, endDate }) => {
            setRentalStart(startDate);
            setRentalEnd(endDate);
          }}
        />
      )}
      {!housingRental && (
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
      )}
      <dl className="space-y-1 text-sm">
        <div className="flex justify-between">
          <dt>{dailyRental ? "Rental" : "Item price"}</dt>
          <dd>{dailyRental && (rentalDays < 1 || overlap) ? "—" : formatMoney(rentalTotal)}</dd>
        </div>
        {!housingRental && (
        <div className="flex justify-between">
          <dt>Delivery fee</dt>
          <dd>{delivery ? formatMoney(delivery) : "None"}</dd>
        </div>
        )}
        <div className="flex justify-between font-semibold">
          <dt>Total</dt>
          <dd>{dailyRental && (rentalDays < 1 || overlap) ? "—" : formatMoney(total)}</dd>
        </div>
      </dl>
      {!payoutsEnabled && (
        <p className="rounded-2xl bg-gold/20 p-3 text-sm">This seller still needs to finish Stripe onboarding before marketplace payments can be collected.</p>
      )}
      {error && <p className="text-sm text-clay">{error}</p>}
      <button
        disabled={pending || !canPay}
        onClick={() =>
          start(async () => {
            try {
              const url = await createCheckoutSession(
                listingId,
                housingRental ? "PICKUP_ONLY" : fulfillment,
                dailyRental ? { startDate: rentalStart, endDate: rentalEnd } : null,
              );
              if (url) window.location.href = url;
            } catch (err) {
              setError(err instanceof Error ? err.message : "Checkout failed.");
            }
          })
        }
        className="w-full rounded-2xl bg-ocean py-3.5 font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Redirecting to Stripe..." : dailyRental ? "Pay rental" : "Pay Securely"}
      </button>
    </div>
  );
}
