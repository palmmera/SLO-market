"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPhotoCollection } from "@/actions/hotspots";
import { MAX_COLLECTION_PHOTOS } from "@/lib/constants";
import { compressImage } from "@/lib/image-compress";

type Variant = "garage" | "produce";

type PickedPhoto = { file: File; url: string };

export function PhotoSaleStart({
  cities,
  categories,
  defaultCityId,
  variant = "garage",
  produceCategoryId,
}: {
  cities: { id: string; name: string }[];
  categories?: { id: string; name: string; parentId: string | null }[];
  defaultCityId?: string;
  variant?: Variant;
  produceCategoryId?: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const isProduce = variant === "produce";
  const parents = categories?.filter((c) => !c.parentId) ?? [];
  const room = MAX_COLLECTION_PHOTOS - photos.length;

  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke only on unmount
  }, []);

  async function addFiles(list: FileList | null) {
    const incoming = Array.from(list || []);
    if (!incoming.length) return;
    setError("");
    const chosen = incoming.slice(0, Math.max(0, MAX_COLLECTION_PHOTOS - photos.length));
    const processed = await Promise.all(
      chosen.map(async (f) => {
        const file = await compressImage(f);
        return { file, url: URL.createObjectURL(file) };
      }),
    );
    setPhotos((prev) => [...prev, ...processed].slice(0, MAX_COLLECTION_PHOTOS));
    if (fileRef.current) fileRef.current.value = "";
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
      className="space-y-4 rounded-3xl bg-white p-5 card-shadow"
      onSubmit={(e) => {
        e.preventDefault();
        if (!photos.length) {
          setError("Please upload at least one photo.");
          return;
        }
        const form = new FormData(e.currentTarget);
        photos.forEach((p) => form.append("photos", p.file));
        if (isProduce && produceCategoryId) {
          form.set("categoryId", produceCategoryId);
          form.set("type", "PRODUCE_STAND");
        }
        start(async () => {
          try {
            const result = await createPhotoCollection(form);
            const base = isProduce ? `/sell/food/photo/${result.collectionId}` : `/sell/photo/${result.collectionId}`;
            router.push(`${base}?image=${result.imageId}&category=${form.get("categoryId")}`);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not start.");
          }
        });
      }}
    >
      <p className="text-sm text-muted">
        {isProduce
          ? `Add up to ${MAX_COLLECTION_PHOTOS} photos of your stand. Tap each item, adjust the box, and add a price.`
          : `Add up to ${MAX_COLLECTION_PHOTOS} photos — one per corner or table. Then tap each item, adjust the box, and add a price.`}
      </p>
      <div>
        {photos.length > 0 && (
          <div className="mb-3 grid grid-cols-4 gap-2">
            {photos.map((p, i) => (
              <div key={p.url} className="relative overflow-hidden rounded-2xl bg-sand">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="aspect-[4/3] w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute right-1 top-1 rounded-full bg-ink/80 px-2 py-0.5 text-[11px] font-semibold text-white"
                  aria-label={`Remove photo ${i + 1}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {room > 0 && (
          <label className="block cursor-pointer">
            <div className="group relative overflow-hidden rounded-2xl border-2 border-dashed border-sand-dark bg-sand px-4 py-8 text-center transition-all hover:border-ocean hover:bg-ocean-light">
              <div className="text-sm font-medium text-muted group-hover:text-ocean transition-colors">
                {photos.length ? `📷 Add another photo (${photos.length}/${MAX_COLLECTION_PHOTOS})` : "📷 Upload photos"}
              </div>
              <div className="mt-1 text-xs text-muted group-hover:text-ocean transition-colors">
                Take photos or choose from your library — up to {MAX_COLLECTION_PHOTOS}
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                void addFiles(e.target.files);
              }}
            />
          </label>
        )}
      </div>
      <input
        name="title"
        placeholder={isProduce ? "Produce stand name" : "Garage sale, yard sale, or room name"}
        defaultValue={isProduce ? "Produce Stand" : "Garage Sale"}
        className="w-full rounded-2xl bg-sand px-4 py-3"
      />
      {!isProduce && (
        <select name="type" className="w-full rounded-2xl bg-sand px-4 py-3">
          <option value="GARAGE_SALE">Garage sale</option>
          <option value="YARD_SALE">Yard sale</option>
          <option value="ROOM">Room / selling area</option>
          <option value="OTHER">Other</option>
        </select>
      )}
      <select name="cityId" defaultValue={defaultCityId} className="w-full rounded-2xl bg-sand px-4 py-3">
        {cities.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {!isProduce && categories && (
        <select name="categoryId" className="w-full rounded-2xl bg-sand px-4 py-3">
          {parents.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
      {error && <p className="text-sm text-clay">{error}</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        <Link
          href={isProduce ? "/sell/food" : "/sell"}
          className="rounded-2xl border-2 border-sand-dark bg-sand py-3 text-center font-semibold text-ink"
        >
          Cancel
        </Link>
        <button disabled={pending} className="rounded-2xl bg-clay py-3 font-semibold text-white">
          {pending ? "Uploading..." : "Open photo editor"}
        </button>
      </div>
    </form>
  );
}
