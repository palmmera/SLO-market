"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImageIcon } from "lucide-react";
import { updateListing } from "@/actions/listings";
import { connectStripeAccount } from "@/actions/orders";
import { CONDITIONS, DELIVERY_RADIUS_OPTIONS } from "@/lib/constants";
import { compressImage } from "@/lib/image-compress";
import { RentalTypePicker } from "@/components/rental-type-picker";
import { ServiceTypePicker } from "@/components/service-type-picker";
import { isHousingRentalSlug, isServiceSlug, RENTAL_DEPOSIT_NOTE_MAX } from "@/lib/utils";

type Option = { id: string; name: string; slug: string; parentId?: string | null; isProduce?: boolean; isFree?: boolean; isRental?: boolean; isService?: boolean };

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
  depositNote?: string;
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
  const rentalParent = parents.find((p) => p.isRental);
  const serviceParent = parents.find((p) => p.isService || p.slug === "services");
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
  const [newPhotos, setNewPhotos] = useState<{ file: File; url: string }[]>([]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const selectedParent = parents.find((p) => p.id === parentId);
  const isRentalListing = listingType === "RENTAL";
  const isServiceListing = listingType === "SERVICE";
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const isHousingRental = isRentalListing && isHousingRentalSlug(selectedCategory?.slug);
  const categoryParents = isRentalListing
    ? parents.filter((p) => p.isRental)
    : isServiceListing
      ? parents.filter((p) => p.isService || p.slug === "services")
      : parents.filter((p) => !p.isRental && !p.isService && p.slug !== "services");
  const totalPhotoCount = existingImages.length + newPhotos.length;

  useEffect(() => {
    if (isRentalListing && rentalParent && parentId !== rentalParent.id) {
      setParentId(rentalParent.id);
      const nextChildren = categories.filter((c) => c.parentId === rentalParent.id);
      if (nextChildren.length && !nextChildren.some((c) => c.id === categoryId)) {
        setCategoryId(nextChildren[0].id);
      }
    } else if (isServiceListing && serviceParent && parentId !== serviceParent.id) {
      setParentId(serviceParent.id);
      const nextChildren = categories.filter((c) => c.parentId === serviceParent.id);
      if (nextChildren.length && !nextChildren.some((c) => c.id === categoryId)) {
        setCategoryId(nextChildren[0].id);
      }
    } else if (
      !isRentalListing &&
      !isServiceListing &&
      (parentId === rentalParent?.id || parentId === serviceParent?.id)
    ) {
      const fallback =
        parents.find((p) => !p.isRental && !p.isService && p.slug !== "services" && !p.isProduce) ??
        parents.find((p) => !p.isRental && !p.isService && p.slug !== "services");
      if (fallback) {
        setParentId(fallback.id);
        const nextChildren = categories.filter((c) => c.parentId === fallback.id);
        setCategoryId((nextChildren[0] ?? fallback).id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingType]);

  useEffect(() => {
    return () => {
      newPhotos.forEach((p) => URL.revokeObjectURL(p.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function removeExistingImage(id: string) {
    setExistingImages((imgs) => imgs.filter((img) => img.id !== id));
    setRemoveImageIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
  }

  async function addFiles(list: FileList | null) {
    const incoming = Array.from(list || []);
    if (!incoming.length) return;
    setError("");
    const room = Math.max(0, 10 - existingImages.length - newPhotos.length);
    const chosen = incoming.slice(0, room);
    const processed = await Promise.all(
      chosen.map(async (f) => {
        const file = await compressImage(f);
        return { file, url: URL.createObjectURL(file) };
      }),
    );
    setNewPhotos((prev) => [...prev, ...processed].slice(0, Math.max(0, 10 - existingImages.length)));
  }

  function removeNewPhoto(index: number) {
    setNewPhotos((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.url);
      return next;
    });
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
        form.set("categoryId", categoryId);
        for (const id of removeImageIds) form.append("removeImageIds", id);
        for (const p of newPhotos) form.append("photos", p.file);
        start(async () => {
          try {
            const result = await updateListing(listing.id, form);
            if (result.needsStripeOnboarding) {
              const stripe = await connectStripeAccount({
                returnPath: `/dashboard/listings/${listing.id}/edit?stripe=return`,
                refreshPath: `/dashboard/listings/${listing.id}/edit?stripe=refresh`,
              });
              if ("error" in stripe && stripe.error) {
                setError(stripe.error);
                return;
              }
              if (!("url" in stripe) || !stripe.url) {
                setError("Could not start Stripe onboarding. Open Dashboard → Manage Stripe.");
                return;
              }
              window.location.href = stripe.url;
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
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={totalPhotoCount >= 10}
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-sand-dark bg-sand px-4 py-5 text-sm font-medium text-muted transition-all hover:border-ocean hover:bg-ocean-light hover:text-ocean disabled:opacity-50"
          >
            <Camera className="h-5 w-5" />
            Take Photo
          </button>
          <button
            type="button"
            onClick={() => libraryRef.current?.click()}
            disabled={totalPhotoCount >= 10}
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-sand-dark bg-sand px-4 py-5 text-sm font-medium text-muted transition-all hover:border-ocean hover:bg-ocean-light hover:text-ocean disabled:opacity-50"
          >
            <ImageIcon className="h-5 w-5" />
            Choose from Library
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">
          {totalPhotoCount}/10 photos · new photos are optimized on your device before upload
        </p>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={libraryRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {newPhotos.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-5">
            {newPhotos.map((p, index) => (
              <div key={p.url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="h-24 w-full rounded-xl object-cover" />
                <button
                  type="button"
                  onClick={() => removeNewPhoto(index)}
                  className="absolute right-1 top-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-clay"
                >
                  Remove
                </button>
              </div>
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
        <h2 className="font-semibold">{isRentalListing ? "Rental type" : isServiceListing ? "Service type" : "Category"}</h2>
        {isRentalListing ? (
          <RentalTypePicker options={categoryOptions} value={categoryId} onChange={setCategoryId} />
        ) : isServiceListing ? (
          <ServiceTypePicker
            options={
              serviceParent
                ? categories.filter((c) => c.parentId === serviceParent.id || (isServiceSlug(c.slug) && c.slug !== "services"))
                : categoryOptions
            }
            value={categoryId}
            onChange={setCategoryId}
          />
        ) : (
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
            {categoryParents.map((c) => (
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
        )}
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
            ["RENTAL", "Rentals"],
            ["SERVICE", "Service"],
          ].map(([value, label]) => {
            const selected = value === "FOR_SALE" ? listingType === "FOR_SALE" || listingType === "FREE" : listingType === value;
            return (
            <button
              key={value}
              type="button"
              onClick={() => setListingType(value)}
              className={`rounded-2xl px-3 py-3 text-sm font-semibold ${selected ? "bg-ocean text-white" : "bg-sand"}`}
            >
              {label}
            </button>
            );
          })}
        </div>
        {listingType === "FOR_SALE" && (
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
        {listingType === "RENTAL" && (
          <>
            <label className="mt-4 block">
              <span className="text-sm font-medium">
                {isHousingRental ? "Price per night" : "Price per day"}
              </span>
              <input
                name="price"
                type="number"
                min="1"
                step="0.01"
                required
                defaultValue={(listing.priceCents / 100).toFixed(2)}
                placeholder={isHousingRental ? "e.g. 100 per night" : "e.g. 10 per day"}
                className="mt-2 w-full rounded-2xl border border-sand-dark bg-sand px-4 py-3"
              />
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-medium">Deposit note (optional)</span>
              <input
                name="depositNote"
                maxLength={RENTAL_DEPOSIT_NOTE_MAX}
                defaultValue={listing.depositNote || ""}
                placeholder="e.g. $100 cash at pickup, returned when the item comes back in the same condition."
                className="mt-2 w-full rounded-2xl border border-sand-dark bg-sand px-4 py-3"
              />
              <span className="mt-1 block text-xs text-muted">
                If you collect a deposit yourself, say so here. SLO Market does not collect, hold, or refund deposits.
              </span>
            </label>
          </>
        )}
        {listingType === "SERVICE" && (
          <label className="mt-4 block">
            <span className="text-sm font-medium">Rate / Price</span>
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
        {listingType === "FREE" && <p className="mt-4 font-display text-2xl text-ocean">FREE</p>}
        {(listingType === "FOR_SALE" || listingType === "FREE") && (
          <label className="mt-3 flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={listingType === "FREE"}
              onChange={(e) => setListingType(e.target.checked ? "FREE" : "FOR_SALE")}
            />
            This item is free
          </label>
        )}
        {listingType === "RENTAL" && (
          <p className="mt-3 text-sm text-muted">
            {isHousingRental
              ? "Enter the nightly rate. Guests pick check-in and check-out on a calendar and pay this rate × number of nights."
              : "Enter the daily rate. Renters pick start and end dates on a calendar and pay this rate × number of days."}
          </p>
        )}
        {listingType === "SERVICE" && (
          <p className="mt-3 text-sm text-muted">
            Offer a local service. Buyers will message you to arrange details.
          </p>
        )}
      </section>

      {listingType !== "SERVICE" && !isHousingRental && (
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

      {listingType !== "SERVICE" && !isHousingRental && (
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
      )}

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
