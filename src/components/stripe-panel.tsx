"use client";

import { useState, useTransition } from "react";
import { connectStripeAccount, openStripeDashboard, refreshStripeStatus, deleteStripeAccount } from "@/actions/orders";
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
        <button
          disabled={pending || !stripeConfigured}
          className="rounded-2xl bg-ocean py-3 font-semibold text-white disabled:opacity-50"
          onClick={() =>
            start(async () => {
              setError("");
              try {
                const url = await connectStripeAccount();
                if (!url) {
                  setError("Could not start Stripe onboarding.");
                  return;
                }
                window.location.href = url;
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not connect Stripe.");
              }
            })
          }
        >
          Connect Stripe
        </button>
        <button
          disabled={pending || !stripeConfigured}
          className="rounded-2xl bg-sand py-3 font-semibold disabled:opacity-50"
          onClick={() =>
            start(async () => {
              setError("");
              try {
                await refreshStripeStatus();
                window.location.reload();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not refresh status.");
              }
            })
          }
        >
          Refresh status
        </button>
        {status !== "NOT_CONNECTED" && (
          <button
            disabled={!stripeConfigured}
            className="rounded-2xl bg-ink py-3 font-semibold text-white disabled:opacity-50"
            onClick={() =>
              start(async () => {
                setError("");
                try {
                  const url = await openStripeDashboard();
                  window.location.href = url;
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not open Stripe.");
                }
              })
            }
          >
            Manage Stripe Account
          </button>
        )}
        {status !== "NOT_CONNECTED" && status !== "PAYOUTS_ENABLED" && (
          <button
            disabled={pending || !stripeConfigured}
            className="rounded-2xl border-2 border-clay/20 bg-white py-3 font-semibold text-clay disabled:opacity-50"
            onClick={() =>
              start(async () => {
                if (!confirm("This will disconnect and delete your Stripe account. You'll need to reconnect. Continue?")) {
                  return;
                }
                setError("");
                try {
                  await deleteStripeAccount();
                  window.location.reload();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not reset Stripe account.");
                }
              })
            }
          >
            Reset Stripe Account
          </button>
        )}
      </div>
    </div>
  );
}
