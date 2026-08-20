"use client";

import { connectStripeAccount, openStripeDashboard, refreshStripeStatus } from "@/actions/orders";
import { stripeStatusLabel } from "@/lib/utils";
import { useTransition } from "react";

export function StripeConnectPanel({
  status,
  detailsSubmitted,
  chargesEnabled,
  payoutsEnabled,
}: {
  status: string;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="rounded-3xl bg-white p-6 card-shadow">
      <h1 className="font-display text-3xl">Get Paid Through SLO Market</h1>
      <p className="mt-2 text-sm text-muted">
        Connect a free Stripe Express account to receive payouts. Listings stay free—SLO Market only takes a 12% commission on completed sales. Stripe bills its own card-processing fees to your connected account; SLO Market does not charge monthly seller fees.
      </p>
      <div className="mt-5 rounded-2xl bg-sand p-4">
        <div className="text-sm font-semibold">Stripe status: {stripeStatusLabel(status)}</div>
        <ul className="mt-2 text-sm text-muted">
          <li>Verification submitted: {detailsSubmitted ? "Yes" : "No"}</li>
          <li>Charges enabled: {chargesEnabled ? "Yes" : "No"}</li>
          <li>Payouts enabled: {payoutsEnabled ? "Yes" : "No"}</li>
        </ul>
      </div>
      <div className="mt-4 grid gap-2">
        <button
          disabled={pending}
          className="rounded-2xl bg-ocean py-3 font-semibold text-white"
          onClick={() =>
            start(async () => {
              const url = await connectStripeAccount();
              window.location.href = url;
            })
          }
        >
          Connect Stripe
        </button>
        <button
          disabled={pending}
          className="rounded-2xl bg-sand py-3 font-semibold"
          onClick={() =>
            start(async () => {
              await refreshStripeStatus();
            })
          }
        >
          Refresh status
        </button>
        {status !== "NOT_CONNECTED" && (
          <button
            className="rounded-2xl bg-ink py-3 font-semibold text-white"
            onClick={() =>
              start(async () => {
                const url = await openStripeDashboard();
                window.location.href = url;
              })
            }
          >
            Manage Stripe Account
          </button>
        )}
      </div>
    </div>
  );
}
