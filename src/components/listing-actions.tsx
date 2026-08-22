"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { startMessage, toggleFavorite, reportContent, blockUser } from "@/actions/listings";
import { SUGGESTED_FIRST_MESSAGE } from "@/lib/constants";

export function ListingActions({
  listingId,
  sellerId,
  canBuy,
  favorited,
  isOwner,
}: {
  listingId: string;
  sellerId: string;
  canBuy: boolean;
  favorited: boolean;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(favorited);
  const [message, setMessage] = useState(SUGGESTED_FIRST_MESSAGE);
  const [pending, start] = useTransition();
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <div className="space-y-3">
      {!isOwner && (
        <>
          {canBuy && (
            <button
              onClick={() => router.push(`/checkout/${listingId}`)}
              className="w-full rounded-2xl bg-ocean py-3.5 font-semibold text-white"
            >
              Buy Now
            </button>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const id = await startMessage(listingId, message);
                router.push(`/messages/${id}`);
              });
            }}
            className="rounded-2xl bg-sand p-3"
          >
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="w-full rounded-xl bg-white px-3 py-2 text-sm" />
            <button disabled={pending} className="mt-2 w-full rounded-xl bg-ink py-2.5 text-sm font-semibold text-white">
              Message Seller
            </button>
          </form>
        </>
      )}
      <div className="flex gap-2">
        <button
          onClick={() =>
            start(async () => {
              const res = await toggleFavorite(listingId);
              setSaved(res.favorited);
            })
          }
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-medium card-shadow"
        >
          <Heart className={`h-4 w-4 ${saved ? "fill-clay text-clay" : ""}`} />
          {saved ? "Saved" : "Save"}
        </button>
        <button onClick={() => setReportOpen((v) => !v)} className="flex-1 rounded-2xl bg-white py-3 text-sm font-medium card-shadow">
          Report Listing
        </button>
      </div>
      {reportOpen && (
        <form
          action={async (formData) => {
            formData.set("targetType", "LISTING");
            formData.set("listingId", listingId);
            await reportContent(formData);
            setReportOpen(false);
          }}
          className="space-y-2 rounded-2xl bg-white p-3"
        >
          <select name="reason" className="w-full rounded-xl bg-sand px-3 py-2 text-sm">
            <option value="SPAM">Report spam</option>
            <option value="PROHIBITED">Report prohibited item</option>
            <option value="FRAUD">Report fraud</option>
            <option value="INAPPROPRIATE">Report inappropriate content</option>
            <option value="OTHER">Other</option>
          </select>
          <textarea name="details" placeholder="Details" className="w-full rounded-xl bg-sand px-3 py-2 text-sm" />
          <button className="w-full rounded-xl bg-clay py-2 text-sm font-semibold text-white">Submit report</button>
          <button type="button" className="w-full text-sm" onClick={() => blockUser(sellerId)}>
            Block user
          </button>
        </form>
      )}
    </div>
  );
}

export function Gallery({ images, title }: { images: { url: string; alt: string | null }[]; title: string }) {
  const [active, setActive] = useState(0);
  const current = images[active];
  return (
    <div>
      <div className="overflow-hidden rounded-[28px] bg-sand-dark">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.url} alt={current.alt || title} className="aspect-[4/3] w-full object-cover" />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center text-muted">No photos</div>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button key={img.url} type="button" onClick={() => setActive(i)} className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl ${i === active ? "ring-2 ring-ocean" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
