"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createListing, startEnhancedDescriptionCheckout } from "@/actions/listings";
import { connectStripeAccount } from "@/actions/orders";
import { CONDITIONS, DELIVERY_RADIUS_OPTIONS } from "@/lib/constants";

type Option = { id: string; name: string; slug: string; parentId?: string | null; isProduce?: boolean; isFree?: boolean };

export function SellForm({
  categories,
  cities,
  defaultCityId,
  stripeReady = false,
}: {
  categories: Option[];
  cities: Option[];
  defaultCityId?: string;
  stripeReady?: boolean;
}) {
  const router = useRouter();
  const parents = categories.filter((c) => !c.parentId);
  const [parentId, setParentId] = useState(parents[0]?.id ?? "");
  const children = useMemo(() => categories.filter((c) => c.parentId === parentId), [categories, parentId]);
  const [listingType, setListingType] = useState("FOR_SALE");
  const [fulfillment, setFulfillment] = useState("PICKUP_ONLY");
  const [enhanced, setEnhanced] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const selectedParent = parents.find((p) => p.id === parentId);

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        const form = new FormData(e.currentTarget);
        form.set("listingType", listingType);
        form.set("fulfillment", fulfillment);
        form.set("enhanced", enhanced ? "1" : "0");
        start(async () => {
          try {
            const result = await createListing(form);
            if (result.needsStripeOnboarding) {
              const url = await connectStripeAccount({
                returnPath: `/dashboard/listings/${result.listingId}/edit?stripe=return`,
                refreshPath: `/dashboard/listings/${result.listingId}/edit?stripe=refresh`,
              });
              window.location.href = url;
              return;
            }
            if (result.needsEnhancedPayment) {
              const url = await startEnhancedDescriptionCheckout(result.listingId);
              if (url) {
                window.location.href = url;
                return;
              }
            }
            router.push(`/listing/${result.slug}`);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not publish listing.");
          }
        });
      }}
    >
      <section className="rounded-3xl bg-white p-5 card-shadow">
        <h2 className="font-semibold">1. Photos</h2>
        <p className="text-sm text-muted">Up to 10 photos. Large, clear pictures sell faster.</p>
        <label className="mt-3 block cursor-pointer">
          <div className="group relative overflow-hidden rounded-2xl border-2 border-dashed border-sand-dark bg-sand px-4 py-8 text-center transition-all hover:border-ocean hover:bg-ocean-light">
            <div className="text-sm font-medium text-muted group-hover:text-ocean transition-colors">
              {previews.length > 0 ? `${previews.length} photo${previews.length > 1 ? 's' : ''} selected` : '📸 Upload Photos'}
            </div>
            <div className="mt-1 text-xs text-muted group-hover:text-ocean transition-colors">
              Take photos or choose from library
            </div>
          </div>
          <input
            name="photos"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []).slice(0, 10);
              setPreviews(files.map((f) => URL.createObjectURL(f)));
            }}
          />
        </label>
        {previews.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {previews.map((src, idx) => (
              <div key={src} className="relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Preview ${idx + 1}`} className="absolute inset-0 h-full w-full rounded-xl object-cover" />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-white p-5 card-shadow">
        <h2 className="font-semibold">2. Title</h2>
        <input
          name="title"
          required
          placeholder="What are you selling?"
          className="mt-3 w-full rounded-2xl border border-sand-dark bg-sand px-4 py-3"
        />
      </section>

      <section className="rounded-3xl bg-white p-5 card-shadow">
        <h2 className="font-semibold">3. Category</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="rounded-2xl border border-sand-dark bg-sand px-4 py-3"
          >
            {parents.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select name="categoryId" required className="rounded-2xl border border-sand-dark bg-sand px-4 py-3">
            {(children.length ? children : parents.filter((p) => p.id === parentId)).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {selectedParent?.isProduce && (
          <p className="mt-3 rounded-xl bg-ocean-light p-3 text-sm text-ocean-dark">
            Local produce listings must follow California and SLO County rules. Do not list prohibited or unpermitted food
            items.
          </p>
        )}
      </section>

      <section className="rounded-3xl bg-white p-5 card-shadow">
        <h2 className="font-semibold">Listing type</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["FOR_SALE", "For Sale"],
            ["FREE", "Free"],
            ["WANTED", "Wanted"],
            ["SERVICE", "Service"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setListingType(value)}
              className={`rounded-2xl px-3 py-3 text-sm font-semibold ${listingType === value ? "bg-ocean text-white" : "bg-sand"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {listingType !== "WANTED" && listingType !== "FREE" && (
          <label className="mt-4 block">
            <span className="text-sm font-medium">{listingType === "SERVICE" ? "4. Rate / Price" : "4. Price"}</span>
            <input
              name="price"
              type="number"
              min="1"
              step="0.01"
              required
              placeholder={listingType === "SERVICE" ? "e.g. 50 per hour or per job" : undefined}
              className="mt-2 w-full rounded-2xl border border-sand-dark bg-sand px-4 py-3"
            />
          </label>
        )}
        {listingType === "FREE" && <p className="mt-3 font-display text-2xl text-ocean">FREE</p>}
        {listingType === "WANTED" && (
          <p className="mt-3 text-sm text-muted">Describe what you are looking for. No price required.</p>
        )}
        {listingType === "SERVICE" && (
          <p className="mt-3 text-sm text-muted">
            Offer a local service (handyman, tutoring, cleaning, and more). Buyers will message you to arrange details.
          </p>
        )}
      </section>

      {listingType !== "WANTED" && listingType !== "SERVICE" && (
        <section className="rounded-3xl bg-white p-5 card-shadow">
          <h2 className="font-semibold">5. Condition</h2>
          <select name="condition" defaultValue="GOOD" className="mt-3 w-full rounded-2xl border border-sand-dark bg-sand px-4 py-3">
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </section>
      )}

      <section className="rounded-3xl bg-white p-5 card-shadow">
        <h2 className="font-semibold">6. Description</h2>
        <div className="mt-3 grid gap-3 rounded-2xl bg-sand p-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setEnhanced(false)}
            className={`rounded-2xl p-4 text-left ${!enhanced ? "bg-white ring-2 ring-ocean" : "bg-transparent"}`}
          >
            <div className="font-semibold">Basic Listing</div>
            <div className="text-ocean font-bold">FREE</div>
          </button>
          <button
            type="button"
            onClick={() => setEnhanced(true)}
            className={`rounded-2xl p-4 text-left ${enhanced ? "bg-white ring-2 ring-ocean" : "bg-transparent"}`}
          >
            <div className="font-semibold">Enhanced Description</div>
            <div className="text-ocean font-bold">$1</div>
            <p className="mt-1 text-xs text-muted">Optional. Extra details like brand, measurements, and history.</p>
          </button>
        </div>
        <textarea
          name="description"
          required
          rows={5}
          placeholder="Tell neighbors what it is, condition, and anything they should know."
          className="mt-4 w-full rounded-2xl border border-sand-dark bg-sand px-4 py-3"
        />
        {enhanced && (
          <div className="mt-4 grid gap-3">
            <input name="brand" placeholder="Brand" className="rounded-2xl border border-sand-dark bg-sand px-4 py-3" />
            <input
              name="measurements"
              placeholder="Measurements"
              className="rounded-2xl border border-sand-dark bg-sand px-4 py-3"
            />
            <textarea
              name="history"
              rows={3}
              placeholder="History or extra details"
              className="rounded-2xl border border-sand-dark bg-sand px-4 py-3"
            />
            <textarea name="extra" rows={3} placeholder="Anything else" className="rounded-2xl border border-sand-dark bg-sand px-4 py-3" />
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-white p-5 card-shadow">
        <h2 className="font-semibold">7. Location</h2>
        <p className="text-sm text-muted">We only show your city publicly — never your home address.</p>
        <select
          name="cityId"
          defaultValue={defaultCityId}
          required
          className="mt-3 w-full rounded-2xl border border-sand-dark bg-sand px-4 py-3"
        >
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
      </section>

      {listingType !== "SERVICE" && (
        <section className="rounded-3xl bg-white p-5 card-shadow">
          <h2 className="font-semibold">8. How will the buyer receive the item?</h2>
          <div className="mt-3 grid gap-2">
            <label className={`rounded-2xl p-4 ${fulfillment === "PICKUP_ONLY" ? "bg-ocean-light" : "bg-sand"}`}>
              <input
                type="radio"
                className="mr-2"
                checked={fulfillment === "PICKUP_ONLY"}
                onChange={() => setFulfillment("PICKUP_ONLY")}
              />
              Pickup Only
            </label>
            <label className={`rounded-2xl p-4 ${fulfillment === "LOCAL_DELIVERY" ? "bg-ocean-light" : "bg-sand"}`}>
              <input
                type="radio"
                className="mr-2"
                checked={fulfillment === "LOCAL_DELIVERY"}
                onChange={() => setFulfillment("LOCAL_DELIVERY")}
              />
              I Can Deliver Locally
            </label>
          </div>
          {fulfillment === "PICKUP_ONLY" && (
            <p className="mt-3 text-sm text-muted">
              Pickup Only. After purchase, use SLO Market messages to arrange a public meetup. Your exact address stays
              private.
            </p>
          )}
          {fulfillment === "LOCAL_DELIVERY" && (
            <div className="mt-4 grid gap-3">
              <select name="deliveryRadiusMiles" defaultValue="10" className="rounded-2xl border border-sand-dark bg-sand px-4 py-3">
                {DELIVERY_RADIUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
                <option value="30">Custom / 30 miles</option>
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="freeDelivery" /> Free Local Delivery
              </label>
              <input
                name="deliveryFee"
                type="number"
                min="0"
                step="0.01"
                placeholder="Delivery fee (leave 0 for free)"
                className="rounded-2xl border border-sand-dark bg-sand px-4 py-3"
              />
            </div>
          )}
        </section>
      )}

      {error && <p className="text-sm text-clay">{error}</p>}
      <button disabled={pending} className="w-full rounded-2xl bg-clay py-4 text-lg font-semibold text-white">
        {pending
          ? stripeReady
            ? "Publishing..."
            : "Taking you to Stripe..."
          : stripeReady
            ? "9. Publish"
            : "9. Finish Stripe to publish"}
      </button>
      <p className="text-center text-xs text-muted">
        {stripeReady
          ? "Basic listings are free. Enhanced description is optional and $1."
          : "Publishing requires a free Stripe account so buyers can pay you through SLO Market."}
      </p>
    </form>
  );
}
