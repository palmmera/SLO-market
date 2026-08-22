"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Maximize2, Minus, Plus, RotateCcw, X } from "lucide-react";
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

const MAX_SCALE = 6;
const MIN_SCALE = 1;

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
  const [expanded, setExpanded] = useState(false);
  const dragging = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const visible = useMemo(() => items.filter((i) => !(hideSold && i.status === "SOLD")), [items, hideSold]);

  function reset() {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  function stopControlDrag(e: React.PointerEvent) {
    e.stopPropagation();
  }

  const stage = (className: string) => (
    <div
      className={`relative ${className} cursor-grab touch-none overflow-hidden`}
      onWheel={(e) => {
        e.preventDefault();
        setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + (e.deltaY < 0 ? 0.15 : -0.15))));
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
      <div className="absolute inset-0 origin-center" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}>
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
  );

  const zoomControls = (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onPointerDown={stopControlDrag}
        onClick={() => setScale((s) => Math.max(MIN_SCALE, s - 0.4))}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink shadow"
        aria-label="Zoom out"
      >
        <Minus className="h-4 w-4" />
      </button>
      <button
        type="button"
        onPointerDown={stopControlDrag}
        onClick={() => setScale((s) => Math.min(MAX_SCALE, s + 0.4))}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink shadow"
        aria-label="Zoom in"
      >
        <Plus className="h-4 w-4" />
      </button>
      <button
        type="button"
        onPointerDown={stopControlDrag}
        onClick={reset}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink shadow"
        aria-label="Reset zoom"
      >
        <RotateCcw className="h-4 w-4" />
      </button>
    </div>
  );

  const detailCard = selected && (
    <div className="rounded-2xl bg-white p-4 shadow-lg">
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
  );

  return (
    <>
      <div className="relative overflow-hidden rounded-[28px] bg-ink">
        {stage("aspect-[4/3] w-full")}
        <div className="absolute right-3 top-3 flex items-center gap-1.5">
          {zoomControls}
          <button
            type="button"
            onPointerDown={stopControlDrag}
            onClick={() => {
              reset();
              setExpanded(true);
            }}
            className="flex h-9 items-center gap-1.5 rounded-full bg-white/90 px-3 text-sm font-semibold text-ink shadow"
            aria-label="Expand photo to fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
            Expand
          </button>
        </div>
        {selected && <div className="m-3">{detailCard}</div>}
      </div>

      {expanded && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black/95 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
            <span className="hidden text-sm text-white/70 sm:block">
              Tap a tagged item · scroll or use +/− to zoom · drag to pan
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              {zoomControls}
              <button
                type="button"
                onPointerDown={stopControlDrag}
                onClick={() => {
                  setExpanded(false);
                  reset();
                }}
                className="flex h-9 items-center gap-1.5 rounded-full bg-white/90 px-3 text-sm font-semibold text-ink shadow"
                aria-label="Close fullscreen"
              >
                <X className="h-4 w-4" />
                Close
              </button>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center px-3 pb-3">
            <div className="relative aspect-[4/3] w-full max-w-[min(96vw,124vh)] overflow-hidden rounded-2xl bg-ink">
              {stage("h-full w-full")}
            </div>
          </div>
          {selected && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3">
              <div className="pointer-events-auto mx-auto max-w-lg">{detailCard}</div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
