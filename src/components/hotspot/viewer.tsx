"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

function priceTag(item: HotspotViewItem) {
  return item.status === "SOLD" ? "Sold" : item.markerLabel || formatMoney(item.priceCents);
}

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

  const canBuy = showBuy && selected && selected.status === "ACTIVE" && selected.priceCents > 0;

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
          const centerX = (item.x + item.width / 2) * 100;
          const centerY = (item.y + item.height / 2) * 100;
          return (
            <button
              key={item.id}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => selectItem(item)}
              className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold shadow-md transition-transform ${
                isSelected
                  ? "scale-110 bg-gold text-ink ring-2 ring-white"
                  : "bg-gold text-ink hover:scale-105"
              } ${item.status === "SOLD" ? "opacity-70" : ""}`}
              style={{
                left: `${centerX}%`,
                top: `${centerY}%`,
              }}
            >
              {priceTag(item)}
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
            {selected.status === "SOLD" ? "Sold" : selected.priceCents === 0 ? "FREE" : formatMoney(selected.priceCents)}
          </div>
          {selected.condition && <p className="mt-2 text-sm text-muted">Condition: {selected.condition}</p>}
          <p className="mt-3 text-sm text-muted">{selected.description || "See photo."}</p>
          {selected.status === "SOLD" ? (
            <p className="mt-4 rounded-2xl bg-sand px-4 py-3 text-sm font-semibold">This item has sold.</p>
          ) : (
            canBuy && (
              <button
                type="button"
                onClick={() => router.push(`/checkout/${selected.id}`)}
                className="mt-4 w-full rounded-2xl bg-ocean py-3.5 font-semibold text-white"
              >
                Buy this item
              </button>
            )
          )}
          <p className="mt-4 text-xs text-muted">Tap a price tag in the photo to switch items.</p>
        </>
      ) : (
        <p className="text-sm text-muted">Tap a price tag in the photo to see details.</p>
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
        <div className="fixed inset-0 z-[60] flex bg-black/95 backdrop-blur-sm">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
              <span className="hidden text-sm text-white/70 sm:block">
                Tap a price tag · scroll or use +/− to zoom · drag to pan
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
              <div className="relative aspect-[4/3] h-full max-h-full w-full max-w-full overflow-hidden rounded-2xl bg-ink">
                {stage("h-full w-full")}
              </div>
            </div>
          </div>
          <aside className="w-[min(18rem,38vw)] shrink-0 overflow-y-auto border-l border-white/10 bg-sand/95 p-3 sm:w-[min(22rem,34vw)] sm:p-4">
            {detailPanel}
          </aside>
        </div>
      )}
    </>
  );
}
