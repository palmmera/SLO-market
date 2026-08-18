"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/utils";

export type HotspotViewItem = {
  id: string;
  slug: string;
  title: string;
  priceCents: number;
  description: string;
  status: string;
  x: number;
  y: number;
  width: number;
  height: number;
  markerLabel?: string | null;
};

export function InteractivePhotoViewer({
  imageUrl,
  items,
  hideSold = false,
}: {
  imageUrl: string;
  items: HotspotViewItem[];
  hideSold?: boolean;
}) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selected, setSelected] = useState<HotspotViewItem | null>(null);
  const [more, setMore] = useState(false);
  const dragging = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const visible = useMemo(() => items.filter((i) => !(hideSold && i.status === "SOLD")), [items, hideSold]);

  return (
    <div className="overflow-hidden rounded-[28px] bg-ink">
      <div
        className="relative aspect-[4/3] cursor-grab touch-none overflow-hidden"
        onWheel={(e) => {
          e.preventDefault();
          setScale((s) => Math.min(6, Math.max(1, s + (e.deltaY < 0 ? 0.15 : -0.15))));
        }}
        onPointerDown={(e) => {
          dragging.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
          (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return;
          setPan({
            x: dragging.current.panX + (e.clientX - dragging.current.x),
            y: dragging.current.panY + (e.clientY - dragging.current.y),
          });
        }}
        onPointerUp={() => {
          dragging.current = null;
        }}
      >
        <div
          className="absolute inset-0 origin-center"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="h-full w-full object-contain" draggable={false} />
          {visible.map((item) => (
            <button
              key={item.id}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                setSelected(item);
                setMore(false);
              }}
              className="absolute rounded-md border-2 border-white/90 bg-black/10"
              style={{
                left: `${item.x * 100}%`,
                top: `${item.y * 100}%`,
                width: `${item.width * 100}%`,
                height: `${item.height * 100}%`,
              }}
            >
              <span className="absolute -top-3 left-1 rounded-full bg-gold px-2 py-0.5 text-[11px] font-bold text-ink">
                {item.status === "SOLD" ? "Sold" : item.markerLabel || formatMoney(item.priceCents)}
              </span>
            </button>
          ))}
        </div>
      </div>
      {selected && (
        <div className="m-3 rounded-2xl bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">{selected.title}</div>
              <div className="text-ocean font-bold">
                {selected.status === "SOLD" ? "Sold" : selected.priceCents === 0 ? "FREE" : formatMoney(selected.priceCents)}
              </div>
              <p className="mt-1 text-sm text-muted">{selected.description}</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-sm">
              Close
            </button>
          </div>
          {!more ? (
            <button onClick={() => setMore(true)} className="mt-3 w-full rounded-xl bg-sand py-2 text-sm font-semibold">
              Learn More
            </button>
          ) : (
            <Link href={`/listing/${selected.slug}`} className="mt-3 block rounded-xl bg-ocean py-2 text-center text-sm font-semibold text-white">
              View full listing
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
