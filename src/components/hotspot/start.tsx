"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPhotoCollection } from "@/actions/hotspots";
import { EXPLORE_VIDEO_MAX_SECONDS } from "@/lib/constants";
import { prepareExploreVideo } from "@/lib/explore-video-client";

type Variant = "garage" | "produce";
type MediaMode = "photo" | "video";

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
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [fileName, setFileName] = useState("");
  const [mediaMode, setMediaMode] = useState<MediaMode>("photo");
  const [preparing, setPreparing] = useState(false);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [preparedVideo, setPreparedVideo] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const isProduce = variant === "produce";
  const parents = categories?.filter((c) => !c.parentId) ?? [];
  const useVideo = !isProduce && mediaMode === "video";

  function resetMedia() {
    setFileName("");
    setPosterFile(null);
    setPreparedVideo(null);
    setDuration(null);
    setError("");
  }

  return (
    <form
      className="space-y-4 rounded-3xl bg-white p-5 card-shadow"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        if (isProduce && produceCategoryId) {
          form.set("categoryId", produceCategoryId);
          form.set("type", "PRODUCE_STAND");
        }
        if (useVideo) {
          if (!preparedVideo) {
            setError("Please choose a short video first.");
            return;
          }
          form.set("video", preparedVideo);
          if (posterFile) form.set("poster", posterFile);
          if (duration != null) form.set("duration", String(duration));
          form.delete("photo");
        } else {
          form.delete("video");
          form.delete("poster");
          form.delete("duration");
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
          ? "Photograph your stand or table. Tap each item, adjust the box, and add a price."
          : useVideo
            ? `Upload a short clip (up to ${EXPLORE_VIDEO_MAX_SECONDS} seconds). iPhone videos are fine — large 4K files get shrunk automatically. Buyers drag left and right to look around — no play button.`
            : "Take a photo or choose from your library. Then tap each item, adjust the box, and add a price."}
      </p>

      {!isProduce && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setMediaMode("photo");
              resetMedia();
            }}
            className={`rounded-2xl border-2 py-2.5 text-sm font-semibold ${
              mediaMode === "photo" ? "border-ocean bg-ocean-light text-ocean-dark" : "border-sand-dark bg-sand text-ink"
            }`}
          >
            Photo
          </button>
          <button
            type="button"
            onClick={() => {
              setMediaMode("video");
              resetMedia();
            }}
            className={`rounded-2xl border-2 py-2.5 text-sm font-semibold ${
              mediaMode === "video" ? "border-ocean bg-ocean-light text-ocean-dark" : "border-sand-dark bg-sand text-ink"
            }`}
          >
            Drag-to-explore video
          </button>
        </div>
      )}

      <label className="block cursor-pointer">
        <div className="group relative overflow-hidden rounded-2xl border-2 border-dashed border-sand-dark bg-sand px-4 py-8 text-center transition-all hover:border-ocean hover:bg-ocean-light">
          <div className="text-sm font-medium text-muted transition-colors group-hover:text-ocean">
            {fileName ? fileName : useVideo ? "Upload a short video" : "📷 Upload an image"}
          </div>
          <div className="mt-1 text-xs text-muted transition-colors group-hover:text-ocean">
            {useVideo
              ? `From your phone, up to ${EXPLORE_VIDEO_MAX_SECONDS} seconds`
              : "Take a photo or choose from library"}
          </div>
        </div>
        {useVideo ? (
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/webm,.mp4,.m4v,.mov,.webm"
            required
            className="hidden"
            onChange={async (e) => {
              const input = e.currentTarget;
              const file = input.files?.[0];
              setFileName(file ? file.name : "");
              setPosterFile(null);
              setPreparedVideo(null);
              setDuration(null);
              setError("");
              if (!file) return;
              setPreparing(true);
              try {
                const captured = await prepareExploreVideo(file);
                setPreparedVideo(captured.video);
                setPosterFile(captured.poster);
                setDuration(captured.duration);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not read that video.");
                setFileName("");
                input.value = "";
              } finally {
                setPreparing(false);
              }
            }}
          />
        ) : (
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
        )}
      </label>

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
        <button
          disabled={pending || preparing || (useVideo && !preparedVideo)}
          className="rounded-2xl bg-clay py-3 font-semibold text-white"
        >
          {preparing
            ? "Preparing video..."
            : pending
              ? "Uploading..."
              : useVideo
                ? "Open video editor"
                : "Open photo editor"}
        </button>
      </div>
    </form>
  );
}
