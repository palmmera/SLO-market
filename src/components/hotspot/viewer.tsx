"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Maximize2, Minus, Plus, RotateCcw, X } from "lucide-react";
import { formatMoney } from "@/lib/utils";

export type HotspotViewItem = {
  id: string;
  slug: string;
  title: string;
  priceCents: number;
  description: string;
  status: string;
  condition?: string | null;
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
  initialItemSlug,
  showBuy = true,
}: {
  imageUrl: string;
  items: HotspotViewItem[];
  hideSold?: boolean;
  initialItemSlug?: string;
  showBuy?: boolean;
}) {
  const router = useRouter();
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [more, setMore] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const dragging = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const visible = useMemo(() => items.filter((i) => !(hideSold && i.status === "SOLD")), [items, hideSold]);

  const [selected, setSelected] = useState<HotspotViewItem | null>(() => {
    if (initialItemSlug) {
      const match = items.find((i) => i.slug === initialItemSlug);
      if (match && !(hideSold && match.status === "SOLD")) return match;
    }
    return items.find((i) => !(hideSold && i.status === "SOLD")) ?? null;
  });

  function selectItem(item: HotspotViewItem) {
    setSelected(item);
    setMore(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("item", item.slug);
      window.history.replaceState({}, "", url.toString());
    }
  }

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

  const canBuy =
    showBuy && selected && selected.status === "ACTIVE" && selected.priceCents > 0;

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
        {visible.map((item) => {
          const isSelected = selected?.id === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => selectItem(item)}
              className={`absolute rounded-md border-2 ${
                isSelected ? "border-gold bg-gold/20 ring-2 ring-gold" : "border-white/90 bg-black/10"
              }`}
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
          );
        })}
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

  const detailPanel = (
    <div className="rounded-3xl bg-white p-5 card-shadow">
      {selected ? (
        <>
          <p className="text-xs uppercase tracking-[0.15em] text-muted">Selected item</p>
          <h2 className="mt-1 font-display text-3xl">{selected.title}</h2>
          <div className="mt-2 text-2xl font-bold text-ocean">
            {selected.status === "SOLD"
              ? "Sold"
              : selected.priceCents === 0
                ? "FREE"
                : formatMoney(selected.priceCents)}
          </div>
          {selected.condition && <p className="mt-2 text-sm text-muted">Condition: {selected.condition}</p>}
          <p className="mt-3 text-sm text-muted">{selected.description || "See photo."}</p>
          {selected.status === "SOLD" ? (
            <p className="mt-4 rounded-2xl bg-sand px-4 py-3 text-sm font-semibold">This item has sold.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {canBuy && (
                <button
                  type="button"
                  onClick={() => router.push(`/checkout/${selected.id}`)}
                  className="w-full rounded-2xl bg-ocean py-3.5 font-semibold text-white"
                >
                  Buy this item
                </button>
              )}
              {!more ? (
                <button
                  type="button"
                  onClick={() => setMore(true)}
                  className="w-full rounded-2xl bg-sand py-3 text-sm font-semibold"
                >
                  Learn more
                </button>
              ) : (
                <Link
                  href={`/listing/${selected.slug}`}
                  className="block w-full rounded-2xl bg-ink py-3 text-center text-sm font-semibold text-white"
                >
                  Open full item page
                </Link>
              )}
            </div>
          )}
          <p className="mt-4 text-xs text-muted">Tap another tagged item in the photo to switch details.</p>
        </>
      ) : (
        <p className="text-sm text-muted">Tap a tagged item in the photo to see its price and details.</p>
      )}
    </div>
  );

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
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
        </div>
        <div className="lg:sticky lg:top-4 lg:self-start">{detailPanel}</div>
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
              <div className="pointer-events-auto mx-auto max-w-lg">{detailPanel}</div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
