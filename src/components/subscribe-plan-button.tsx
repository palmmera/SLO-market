"use client";

import { useState, useTransition } from "react";
import { openSellerPlanPortal, startSellerPlanCheckout } from "@/actions/seller-plan";

export function SubscribePlanButton({
  returnPath = "/dashboard",
  active = false,
  label,
  className = "rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white",
}: {
  returnPath?: string;
  active?: boolean;
  label?: string;
  className?: string;
}) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const text = label || (active ? "Manage Seller Plan" : "Subscribe — $10/month");

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError("");
            const result = active
              ? await openSellerPlanPortal(returnPath)
              : await startSellerPlanCheckout(returnPath);
            if ("error" in result && result.error) {
              setError(result.error);
              return;
            }
            if ("url" in result && result.url) window.location.href = result.url;
          })
        }
        className={`${className} disabled:opacity-60`}
      >
        {pending ? "Opening Stripe..." : text}
      </button>
      {error && <p className="mt-2 text-sm text-clay">{error}</p>}
    </div>
  );
}
