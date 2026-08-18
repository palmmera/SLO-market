"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
      <p className="text-sm text-muted">Take one photo of your garage, yard, room, or produce stand. Then tap each item, adjust the box, and add a price.</p>
      <input name="photo" type="file" accept="image/*" capture="environment" required className="w-full text-sm" />
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
      <button disabled={pending} className="w-full rounded-2xl bg-clay py-3 font-semibold text-white">
        {pending ? "Uploading..." : "Open photo editor"}
      </button>
    </form>
  );
}
