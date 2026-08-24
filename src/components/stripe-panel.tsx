"use client";

import { useState, useTransition } from "react";
import { connectStripeAccount, openStripeDashboard } from "@/actions/orders";
import { stripeStatusLabel } from "@/lib/utils";

export function StripeConnectPanel({
  status,
  detailsSubmitted,
  chargesEnabled,
  payoutsEnabled,
  stripeConfigured = true,
}: {
  status: string;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  stripeConfigured?: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const isConnected = status === "CONNECTED" || status === "PAYOUTS_ENABLED";

  return (
    <div className="rounded-3xl bg-white p-6 card-shadow">
      <h1 className="font-display text-3xl">Get Paid Through SLO Market</h1>
      <p className="mt-2 text-sm text-muted">
        Connect a free Stripe account to receive payouts. Listings stay free—SLO Market only takes a 12%
        commission on completed sales. Stripe bills its own card-processing fees to your connected account; SLO Market
        does not charge monthly seller fees.
      </p>
      {!stripeConfigured && (
        <p className="mt-4 rounded-2xl bg-clay/10 p-4 text-sm text-clay">
          Stripe isn’t configured on this server yet. Add <code className="font-mono">STRIPE_SECRET_KEY</code> and{" "}
          <code className="font-mono">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> to your <code className="font-mono">.env</code>{" "}
          (from the Stripe Dashboard), then restart the app.
        </p>
      )}
      <div className="mt-5 rounded-2xl bg-sand p-4">
        <div className="text-sm font-semibold">Stripe status: {stripeStatusLabel(status)}</div>
        <ul className="mt-2 text-sm text-muted">
          <li>Verification submitted: {detailsSubmitted ? "Yes" : "No"}</li>
          <li>Charges enabled: {chargesEnabled ? "Yes" : "No"}</li>
          <li>Payouts enabled: {payoutsEnabled ? "Yes" : "No"}</li>
        </ul>
      </div>
      {error && <p className="mt-3 text-sm text-clay">{error}</p>}
      <div className="mt-4 grid gap-2">
        {isConnected ? (
          <button
            disabled={pending || !stripeConfigured}
            className="rounded-2xl bg-ink py-3 font-semibold text-white disabled:opacity-50"
            onClick={() =>
              start(async () => {
                setError("");
                try {
                  const result = await openStripeDashboard();
                  if ("error" in result && result.error) {
                    setError(result.error);
                    return;
                  }
                  if (!("url" in result) || !result.url) {
                    setError("Could not open Stripe.");
                    return;
                  }
                  window.location.href = result.url;
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not open Stripe.");
                }
              })
            }
          >
            Manage Stripe Account
          </button>
        ) : (
          <button
            disabled={pending || !stripeConfigured}
            className="rounded-2xl bg-ocean py-3 font-semibold text-white disabled:opacity-50"
            onClick={() =>
              start(async () => {
                setError("");
                try {
                  const result = await connectStripeAccount();
                  if ("error" in result && result.error) {
                    setError(result.error);
                    return;
                  }
                  if (!("url" in result) || !result.url) {
                    setError("Could not start Stripe onboarding.");
                    return;
                  }
                  window.location.href = result.url;
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not connect Stripe.");
                }
              })
            }
          >
            Connect Stripe
          </button>
        )}
      </div>
    </div>
  );
}
