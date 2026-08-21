"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateListing } from "@/actions/listings";
import { connectStripeAccount } from "@/actions/orders";
import { CONDITIONS, DELIVERY_RADIUS_OPTIONS } from "@/lib/constants";

type Option = { id: string; name: string; slug: string; parentId?: string | null; isProduce?: boolean; isFree?: boolean };

type ExistingImage = { id: string; url: string; thumbnailUrl: string | null };

export type EditListingInitial = {
  id: string;
  title: string;
  description: string;
  listingType: string;
  condition: string | null;
  priceCents: number;
  categoryId: string;
  cityId: string;
  fulfillment: string;
  deliveryRadiusMiles: number | null;
  deliveryFeeCents: number;
  freeDelivery: boolean;
  categoryParentId: string | null;
  images: ExistingImage[];
};

export function EditListingForm({
  categories,
  cities,
  listing,
  stripeReady = true,
  isDraft = false,
}: {
  categories: Option[];
  cities: Option[];
  listing: EditListingInitial;
  stripeReady?: boolean;
  isDraft?: boolean;
}) {
  const router = useRouter();
  const parents = categories.filter((c) => !c.parentId);
  const categoryRecord = categories.find((c) => c.id === listing.categoryId);
  const initialParent =
    listing.categoryParentId ||
    categoryRecord?.parentId ||
    (categoryRecord && !categoryRecord.parentId ? categoryRecord.id : null) ||
    parents[0]?.id ||
    "";
  const [parentId, setParentId] = useState(initialParent);
  const children = useMemo(() => categories.filter((c) => c.parentId === parentId), [categories, parentId]);
  const categoryOptions = children.length ? children : parents.filter((p) => p.id === parentId);
  const [categoryId, setCategoryId] = useState(listing.categoryId);
  const [listingType, setListingType] = useState(listing.listingType);
  const [fulfillment, setFulfillment] = useState(listing.fulfillment);
  const [existingImages, setExistingImages] = useState(listing.images);
  const [removeImageIds, setRemoveImageIds] = useState<string[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const selectedParent = parents.find((p) => p.id === parentId);

  function removeExistingImage(id: string) {
    setExistingImages((imgs) => imgs.filter((img) => img.id !== id));
    setRemoveImageIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        const form = new FormData(e.currentTarget);
        form.set("listingType", listingType);
        form.set("fulfillment", fulfillment);
        for (const id of removeImageIds) form.append("removeImageIds", id);
        start(async () => {
          try {
            const result = await updateListing(listing.id, form);
            if (result.needsStripeOnboarding) {
              const url = await connectStripeAccount({
                returnPath: `/dashboard/listings/${listing.id}/edit?stripe=return`,
                refreshPath: `/dashboard/listings/${listing.id}/edit?stripe=refresh`,
              });
              window.location.href = url;
              return;
            }
            router.push(`/listing/${result.slug}`);
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save listing.");
          }
        });
      }}
    >
      <section className="rounded-3xl bg-white p-5 card-shadow">
        <h2 className="font-semibold">Photos</h2>
        <p className="text-sm text-muted">Keep, remove, or add photos (up to 10 total).</p>
        {existingImages.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-5">
            {existingImages.map((img, index) => (
              <div key={img.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.thumbnailUrl || img.url}
                  alt=""
                  className="h-24 w-full rounded-xl object-cover"
                />
                {index === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-ink/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    Main
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeExistingImage(img.id)}
                  className="absolute right-1 top-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-clay"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <input
          name="photos"
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          className="mt-3 w-full text-sm"
          onChange={(e) => {
            const remainingSlots = Math.max(0, 10 - existingImages.length);
            const files = Array.from(e.target.files || []).slice(0, remainingSlots);
            setPreviews(files.map((f) => URL.createObjectURL(f)));
          }}
        />
        {previews.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-5">
            {previews.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="" className="h-24 w-full rounded-xl object-cover" />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-white p-5 card-shadow">
        <h2 className="font-semibold">Title</h2>
        <input
          name="title"
          required
          defaultValue={listing.title}
          placeholder="What are you selling?"
          className="mt-3 w-full rounded-2xl border border-sand-dark bg-sand px-4 py-3"
        />
      </section>

      <section className="rounded-3xl bg-white p-5 card-shadow">
        <h2 className="font-semibold">Category</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <select
            value={parentId}
            onChange={(e) => {
              const nextParent = e.target.value;
              setParentId(nextParent);
              const nextChildren = categories.filter((c) => c.parentId === nextParent);
              const nextOptions = nextChildren.length ? nextChildren : categories.filter((c) => c.id === nextParent);
              setCategoryId(nextOptions[0]?.id ?? "");
            }}
            className="rounded-2xl border border-sand-dark bg-sand px-4 py-3"
          >
            {parents.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            name="categoryId"
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-2xl border border-sand-dark bg-sand px-4 py-3"
          >
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {selectedParent?.isProduce && (
          <p className="mt-3 rounded-xl bg-ocean-light p-3 text-sm text-ocean-dark">
            Local produce listings must follow California and SLO County rules. Do not list prohibited or unpermitted food items.
          </p>
        )}
      </section>

      <section className="rounded-3xl bg-white p-5 card-shadow">
        <h2 className="font-semibold">Listing type</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            ["FOR_SALE", "For Sale"],
            ["FREE", "Free"],
            ["WANTED", "Wanted"],
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
            <span className="text-sm font-medium">Price</span>
            <input
              name="price"
              type="number"
              min="1"
              step="0.01"
              required
              defaultValue={(listing.priceCents / 100).toFixed(2)}
              className="mt-2 w-full rounded-2xl border border-sand-dark bg-sand px-4 py-3"
            />
          </label>
        )}
        {listingType === "FREE" && <p className="mt-3 font-display text-2xl text-ocean">FREE</p>}
        {listingType === "WANTED" && <p className="mt-3 text-sm text-muted">Describe what you are looking for. No price required.</p>}
      </section>

      {listingType !== "WANTED" && (
        <section className="rounded-3xl bg-white p-5 card-shadow">
          <h2 className="font-semibold">Condition</h2>
          <select
            name="condition"
            defaultValue={listing.condition || "GOOD"}
            className="mt-3 w-full rounded-2xl border border-sand-dark bg-sand px-4 py-3"
          >
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </section>
      )}

      <section className="rounded-3xl bg-white p-5 card-shadow">
        <h2 className="font-semibold">Description</h2>
        <textarea
          name="description"
          required
          rows={5}
          defaultValue={listing.description}
          placeholder="Tell neighbors what it is, condition, and anything they should know."
          className="mt-4 w-full rounded-2xl border border-sand-dark bg-sand px-4 py-3"
        />
      </section>

      <section className="rounded-3xl bg-white p-5 card-shadow">
        <h2 className="font-semibold">Location</h2>
        <p className="text-sm text-muted">We only show your city publicly — never your home address.</p>
        <select name="cityId" defaultValue={listing.cityId} required className="mt-3 w-full rounded-2xl border border-sand-dark bg-sand px-4 py-3">
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
      </section>

      <section className="rounded-3xl bg-white p-5 card-shadow">
        <h2 className="font-semibold">How will the buyer receive the item?</h2>
        <div className="mt-3 grid gap-2">
          <label className={`rounded-2xl p-4 ${fulfillment === "PICKUP_ONLY" ? "bg-ocean-light" : "bg-sand"}`}>
            <input type="radio" className="mr-2" checked={fulfillment === "PICKUP_ONLY"} onChange={() => setFulfillment("PICKUP_ONLY")} />
            Pickup Only
          </label>
          <label className={`rounded-2xl p-4 ${fulfillment === "LOCAL_DELIVERY" ? "bg-ocean-light" : "bg-sand"}`}>
            <input type="radio" className="mr-2" checked={fulfillment === "LOCAL_DELIVERY"} onChange={() => setFulfillment("LOCAL_DELIVERY")} />
            I Can Deliver Locally
          </label>
        </div>
        {fulfillment === "PICKUP_ONLY" && (
          <p className="mt-3 text-sm text-muted">Pickup Only. After purchase, use SLO Market messages to arrange a public meetup. Your exact address stays private.</p>
        )}
        {fulfillment === "LOCAL_DELIVERY" && (
          <div className="mt-4 grid gap-3">
            <select
              name="deliveryRadiusMiles"
              defaultValue={String(listing.deliveryRadiusMiles ?? 10)}
              className="rounded-2xl border border-sand-dark bg-sand px-4 py-3"
            >
              {DELIVERY_RADIUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
              <option value="30">Custom / 30 miles</option>
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="freeDelivery" defaultChecked={listing.freeDelivery} /> Free Local Delivery
            </label>
            <input
              name="deliveryFee"
              type="number"
              min="0"
              step="0.01"
              defaultValue={listing.freeDelivery ? 0 : (listing.deliveryFeeCents / 100).toFixed(2)}
              placeholder="Delivery fee (leave 0 for free)"
              className="rounded-2xl border border-sand-dark bg-sand px-4 py-3"
            />
          </div>
        )}
      </section>

      {error && <p className="text-sm text-clay">{error}</p>}
      <button disabled={pending} className="w-full rounded-2xl bg-clay py-4 text-lg font-semibold text-white">
        {pending
          ? isDraft && !stripeReady
            ? "Taking you to Stripe..."
            : "Saving..."
          : isDraft && !stripeReady
            ? "Finish Stripe to publish"
            : isDraft
              ? "Publish listing"
              : "Save changes"}
      </button>
    </form>
  );
}
