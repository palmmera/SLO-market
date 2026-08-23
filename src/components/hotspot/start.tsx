"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPhotoCollection } from "@/actions/hotspots";

export function PhotoSaleStart({
  cities,
  categories,
  defaultCityId,
}: {
  cities: { id: string; name: string }[];
  categories: { id: string; name: string; parentId: string | null }[];
  defaultCityId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [fileName, setFileName] = useState("");
  const parents = categories.filter((c) => !c.parentId);

  return (
    <form
      className="space-y-4 rounded-3xl bg-white p-5 card-shadow"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        start(async () => {
          try {
            const result = await createPhotoCollection(form);
            router.push(`/sell/photo/${result.collectionId}?image=${result.imageId}&category=${form.get("categoryId")}`);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not start.");
          }
        });
      }}
    >
      <p className="text-sm text-muted">Take a photo or choose from your library. Then tap each item, adjust the box, and add a price.</p>
      <label className="block cursor-pointer">
        <div className="group relative overflow-hidden rounded-2xl border-2 border-dashed border-sand-dark bg-sand px-4 py-8 text-center transition-all hover:border-ocean hover:bg-ocean-light">
          <div className="text-sm font-medium text-muted group-hover:text-ocean transition-colors">
            {fileName ? fileName : '📷 Upload an image'}
          </div>
          <div className="mt-1 text-xs text-muted group-hover:text-ocean transition-colors">
            Take a photo or choose from library
          </div>
        </div>
        <input
          name="photo"
          type="file"
          accept="image/*"
          required
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            setFileName(file ? file.name : "");
          }}
        />
      </label>
      <input name="title" placeholder="Garage sale, yard sale, or room name" defaultValue="Garage Sale" className="w-full rounded-2xl bg-sand px-4 py-3" />
      <select name="type" className="w-full rounded-2xl bg-sand px-4 py-3">
        <option value="GARAGE_SALE">Garage sale</option>
        <option value="YARD_SALE">Yard sale</option>
        <option value="ROOM">Room / selling area</option>
        <option value="PRODUCE_STAND">Produce stand</option>
        <option value="OTHER">Other</option>
      </select>
      <select name="cityId" defaultValue={defaultCityId} className="w-full rounded-2xl bg-sand px-4 py-3">
        {cities.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select name="categoryId" className="w-full rounded-2xl bg-sand px-4 py-3">
        {parents.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-clay">{error}</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        <Link
          href="/sell"
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
