"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImageIcon } from "lucide-react";
import { createListing, startEnhancedDescriptionCheckout } from "@/actions/listings";
import { connectStripeAccount } from "@/actions/orders";
import { CONDITIONS, DELIVERY_RADIUS_OPTIONS } from "@/lib/constants";
import { PRODUCE_PRODUCT_TYPES, produceTypeRequiresPermit } from "@/lib/food-seller";
import { compressImage } from "@/lib/image-compress";
import Link from "next/link";
import { RentalTypePicker } from "@/components/rental-type-picker";
import { ProduceProductType } from "@prisma/client";
import { isHousingRentalSlug } from "@/lib/utils";

type Option = { id: string; name: string; slug: string; parentId?: string | null; isProduce?: boolean; isFree?: boolean; isRental?: boolean };

export function SellForm({
  categories,
  cities,
  defaultCityId,
  stripeReady = false,
  produceMode = false,
  defaultParentId,
  foodSellerActive = false,
}: {
  categories: Option[];
  cities: Option[];
  defaultCityId?: string;
  stripeReady?: boolean;
  produceMode?: boolean;
  defaultParentId?: string;
  foodSellerActive?: boolean;
}) {
  const router = useRouter();
  const parents = categories.filter((c) => !c.parentId);
  const produceParent = parents.find((p) => p.isProduce);
  const rentalParent = parents.find((p) => p.isRental);
  const initialParent = produceMode && defaultParentId ? defaultParentId : parents.find((p) => !p.isRental)?.id ?? parents[0]?.id ?? "";
  const [parentId, setParentId] = useState(initialParent);
  const children = useMemo(() => categories.filter((c) => c.parentId === parentId), [categories, parentId]);
  const [produceProductType, setProduceProductType] = useState<ProduceProductType>("FRESH_PRODUCE");
  const [listingType, setListingType] = useState("FOR_SALE");
  const [rentalCategoryId, setRentalCategoryId] = useState("");
  const [fulfillment, setFulfillment] = useState("PICKUP_ONLY");
  const [enhanced, setEnhanced] = useState(false);
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const selectedParent = parents.find((p) => p.id === parentId);
  const isProduceListing = produceMode || Boolean(selectedParent?.isProduce);
  const isRentalListing = listingType === "RENTAL";
  const rentalCategory = categories.find((c) => c.id === rentalCategoryId);
  const isHousingRental = isRentalListing && isHousingRentalSlug(rentalCategory?.slug);
  const showPermitFields = isProduceListing && produceTypeRequiresPermit(produceProductType);
  const categoryParents = isRentalListing
    ? parents.filter((p) => p.isRental)
    : parents.filter((p) => !p.isRental);

  useEffect(() => {
    if (isRentalListing && rentalParent && parentId !== rentalParent.id) {
      setParentId(rentalParent.id);
    } else if (!isRentalListing && rentalParent && parentId === rentalParent.id) {
      const fallback = parents.find((p) => !p.isRental && !p.isProduce) ?? parents.find((p) => !p.isRental);
      if (fallback) setParentId(fallback.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingType]);

  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addFiles(list: FileList | null) {
    const incoming = Array.from(list || []);
    if (!incoming.length) return;
    setError("");
    const room = Math.max(0, 10 - photos.length);
    const chosen = incoming.slice(0, room);
    const processed = await Promise.all(
      chosen.map(async (f) => {
        const file = await compressImage(f);
        return { file, url: URL.createObjectURL(file) };
      }),
    );
    setPhotos((prev) => [...prev, ...processed].slice(0, 10));
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
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
        form.set("enhanced", enhanced ? "1" : "0");
        if (isRentalListing) {
          if (!rentalCategoryId) {
            setError("Choose what you are renting.");
            return;
          }
          form.set("categoryId", rentalCategoryId);
        }
        if (isProduceListing) {
          form.set("produceProductType", produceProductType);
          if (produceMode && produceParent) form.set("parentCategoryId", produceParent.id);
        }
        for (const p of photos) form.append("photos", p.file);
        start(async () => {
          try {
            const result = await createListing(form);
            if ("error" in result && result.error) {
              setError(result.error);
              return;
            }
            if (!("listingId" in result) || !result.listingId) {
              setError("Could not publish listing.");
              return;
            }
            if (result.needsStripeOnboarding) {
              const stripe = await connectStripeAccount({
                returnPath: `/dashboard/listings/${result.listingId}/edit?stripe=return`,
                refreshPath: `/dashboard/listings/${result.listingId}/edit?stripe=refresh`,
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
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={photos.length >= 10}
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-sand-dark bg-sand px-4 py-6 text-sm font-medium text-muted transition-all hover:border-ocean hover:bg-ocean-light hover:text-ocean disabled:opacity-50"
          >
            <Camera className="h-5 w-5" />
            Take Photo
          </button>
          <button
            type="button"
            onClick={() => libraryRef.current?.click()}
            disabled={photos.length >= 10}
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-sand-dark bg-sand px-4 py-6 text-sm font-medium text-muted transition-all hover:border-ocean hover:bg-ocean-light hover:text-ocean disabled:opacity-50"
          >
            <ImageIcon className="h-5 w-5" />
            Choose from Library
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">
          {photos.length}/10 selected · photos are optimized on your device before upload
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
        {photos.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {photos.map((p, idx) => (
              <div key={p.url} className="relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={`Preview ${idx + 1}`} className="absolute inset-0 h-full w-full rounded-xl object-cover" />
                {idx === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-ink/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    Main
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  className="absolute right-1 top-1 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-clay"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-white p-5 card-shadow">
        <h2 className="font-semibold">{produceMode ? "2. Title" : "2. Title"}</h2>
        <input
          name="title"
          required
          placeholder={
            isProduceListing
              ? "e.g. Heirloom tomatoes, local honey"
              : isRentalListing
                ? "What are you renting?"
                : "What are you selling?"
          }
          className="mt-3 w-full rounded-2xl border border-sand-dark bg-sand px-4 py-3"
        />
      </section>

      <section className="rounded-3xl bg-white p-5 card-shadow">
        <h2 className="font-semibold">3. {isProduceListing ? "Product type" : isRentalListing ? "Rental type" : "Category"}</h2>
        {produceMode ? (
          <select
            name="produceProductType"
            value={produceProductType}
            onChange={(e) => setProduceProductType(e.target.value as ProduceProductType)}
            className="mt-3 w-full rounded-2xl border border-sand-dark bg-sand px-4 py-3"
          >
            {PRODUCE_PRODUCT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        ) : isRentalListing ? (
          <RentalTypePicker
            options={
              rentalParent
                ? categories.filter((c) => c.parentId === rentalParent.id)
                : children.length
                  ? children
                  : categoryParents
            }
            value={rentalCategoryId}
            onChange={setRentalCategoryId}
          />
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="rounded-2xl border border-sand-dark bg-sand px-4 py-3"
            >
              {categoryParents.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {isProduceListing ? (
              <select
                name="produceProductType"
                value={produceProductType}
                onChange={(e) => setProduceProductType(e.target.value as ProduceProductType)}
                className="rounded-2xl border border-sand-dark bg-sand px-4 py-3"
              >
                {PRODUCE_PRODUCT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            ) : (
              <select name="categoryId" required className="rounded-2xl border border-sand-dark bg-sand px-4 py-3">
                {(children.length ? children : categoryParents.filter((p) => p.id === parentId)).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
        {isProduceListing && !foodSellerActive && (
          <p className="mt-3 rounded-xl bg-gold/20 p-3 text-sm">
            Activate Local Food &amp; Produce Seller status before publishing.{" "}
            <Link href="/dashboard/food-seller" className="font-semibold text-ocean">
              Complete verification
            </Link>
          </p>
        )}
        {isProduceListing && (
          <p className="mt-3 rounded-xl bg-ocean-light p-3 text-sm text-ocean-dark">
            Local produce listings must follow California and SLO County rules. Sellers are responsible for compliance; SLO Marketplace does not inspect or certify food.
          </p>
        )}
        {showPermitFields && (
          <div className="mt-3 space-y-3 rounded-2xl border border-sand-dark bg-sand/50 p-4">
            <p className="text-sm font-medium">Permit / registration (when applicable)</p>
            <input name="listingPermitType" placeholder="Permit / registration type" className="w-full rounded-2xl bg-sand px-4 py-3" />
            <input name="listingPermitNumber" placeholder="Permit / registration number" className="w-full rounded-2xl bg-sand px-4 py-3" />
            <input name="listingPermitAgency" placeholder="Issuing agency / county" className="w-full rounded-2xl bg-sand px-4 py-3" />
            <input name="listingPermitExpiresAt" type="date" className="w-full rounded-2xl bg-sand px-4 py-3" />
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-white p-5 card-shadow">
        <h2 className="font-semibold">Listing type</h2>
        <div className={`mt-3 grid gap-2 ${produceMode ? "grid-cols-2" : "grid-cols-3"}`}>
          {([
            ["FOR_SALE", "For Sale"],
            ...(produceMode ? [] : [["RENTAL", "Rentals"]]),
            ["SERVICE", "Service"],
          ] as [string, string][]).map(([value, label]) => {
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
            <span className="text-sm font-medium">4. Price</span>
            <input
              name="price"
              type="number"
              min="1"
              step="0.01"
              required
              className="mt-2 w-full rounded-2xl border border-sand-dark bg-sand px-4 py-3"
            />
          </label>
        )}
        {listingType === "RENTAL" && (
          <label className="mt-4 block">
            <span className="text-sm font-medium">
              {isHousingRental ? "4. Price per night" : "4. Price per day"}
            </span>
            <input
              name="price"
              type="number"
              min="1"
              step="0.01"
              required
              placeholder={isHousingRental ? "e.g. 100 per night" : "e.g. 10 per day"}
              className="mt-2 w-full rounded-2xl border border-sand-dark bg-sand px-4 py-3"
            />
          </label>
        )}
        {listingType === "SERVICE" && (
          <label className="mt-4 block">
            <span className="text-sm font-medium">4. Rate / Price</span>
            <input
              name="price"
              type="number"
              min="1"
              step="0.01"
              required
              placeholder="e.g. 50 per hour or per job"
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
            Offer a local service (handyman, tutoring, cleaning, and more). Buyers will message you to arrange details.
          </p>
        )}
      </section>

      {listingType !== "SERVICE" && !isProduceListing && !isHousingRental && (
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

      {listingType !== "SERVICE" && !isHousingRental && (
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
