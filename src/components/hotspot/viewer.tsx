"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Maximize2, Minus, Plus, RotateCcw, X } from "lucide-react";
import { startMessage } from "@/actions/listings";
import { suggestedFirstMessage } from "@/lib/constants";
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

export type HotspotPhoto = {
  imageUrl: string;
  items: HotspotViewItem[];
};

const MAX_SCALE = 6;
const MIN_SCALE = 1;
const SWIPE_PX = 50;

function isUnavailable(status: string) {
  return status === "SOLD" || status === "RESERVED";
}

function tagLabel(item: HotspotViewItem) {
  return isUnavailable(item.status) ? "Sold" : item.markerLabel || formatMoney(item.priceCents);
}

function firstVisible(list: HotspotViewItem[], hideSold: boolean, preferSlug?: string) {
  if (preferSlug) {
    const match = list.find((i) => i.slug === preferSlug);
    if (match && !(hideSold && isUnavailable(match.status))) return match;
  }
  return list.find((i) => !(hideSold && isUnavailable(i.status))) ?? null;
}

export function InteractivePhotoViewer({
  imageUrl,
  items,
  photos,
  hideSold = false,
  initialItemSlug,
  showBuy = true,
  showMessage = false,
  fulfillmentNote,
  sellerName,
}: {
  imageUrl?: string;
  items?: HotspotViewItem[];
  photos?: HotspotPhoto[];
  hideSold?: boolean;
  initialItemSlug?: string;
  showBuy?: boolean;
  /** When true, buyers can message the seller about the selected item (garage / produce only). */
  showMessage?: boolean;
  /** Pickup / delivery note shown to buyers before purchase. */
  fulfillmentNote?: string;
  sellerName?: string | null;
}) {
  const router = useRouter();
  const gallery = useMemo<HotspotPhoto[]>(() => {
    if (photos?.length) return photos;
    if (imageUrl) return [{ imageUrl, items: items ?? [] }];
    return [];
  }, [photos, imageUrl, items]);

  const [photoIndex, setPhotoIndex] = useState(() => {
    if (!initialItemSlug) return 0;
    const found = gallery.findIndex((p) => p.items.some((i) => i.slug === initialItemSlug));
    return found >= 0 ? found : 0;
  });
  const current = gallery[photoIndex] ?? gallery[0];
  const currentItems = current?.items ?? [];
  const multi = gallery.length > 1;

  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState(() => suggestedFirstMessage(sellerName));
  const [pending, start] = useTransition();
  const dragging = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const visible = useMemo(
    () => currentItems.filter((i) => !(hideSold && isUnavailable(i.status))),
    [currentItems, hideSold],
  );

  const [selected, setSelected] = useState<HotspotViewItem | null>(() =>
    firstVisible(gallery[photoIndex]?.items ?? [], hideSold, initialItemSlug),
  );

  function reset() {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }

  function goTo(nextIndex: number) {
    const wrapped = (nextIndex + gallery.length) % gallery.length;
    if (wrapped === photoIndex || !gallery.length) return;
    setPhotoIndex(wrapped);
    reset();
    setSelected(firstVisible(gallery[wrapped].items, hideSold));
  }

  function selectItem(item: HotspotViewItem) {
    setSelected(item);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("item", item.slug);
      window.history.replaceState({}, "", url.toString());
    }
  }

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
      if (e.key === "ArrowLeft") goTo(photoIndex - 1);
      if (e.key === "ArrowRight") goTo(photoIndex + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, photoIndex, gallery.length]);

  useEffect(() => {
    if (expanded) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft") goTo(photoIndex - 1);
      if (e.key === "ArrowRight") goTo(photoIndex + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, photoIndex, gallery.length]);

  function stopControlDrag(e: React.PointerEvent) {
    e.stopPropagation();
  }

  const canBuy = showBuy && selected && selected.status === "ACTIVE" && selected.priceCents > 0;

  const navArrows =
    multi &&
    (
      <>
        <button
          type="button"
          onPointerDown={stopControlDrag}
          onClick={() => goTo(photoIndex - 1)}
          className="absolute left-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow"
          aria-label="Previous photo"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onPointerDown={stopControlDrag}
          onClick={() => goTo(photoIndex + 1)}
          className="absolute right-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow"
          aria-label="Next photo"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </>
    );

  const dots =
    multi &&
    (
      <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
        {gallery.map((_, i) => (
          <button
            key={i}
            type="button"
            onPointerDown={stopControlDrag}
            onClick={() => goTo(i)}
            className={`h-2.5 w-2.5 rounded-full ${i === photoIndex ? "bg-white" : "bg-white/40"}`}
            aria-label={`Photo ${i + 1}`}
          />
        ))}
      </div>
    );

  const stage = (className: string) => (
    <div
      className={`relative ${className} cursor-grab touch-none overflow-hidden`}
      onWheel={(e) => {
        e.preventDefault();
        setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + (e.deltaY < 0 ? 0.15 : -0.15))));
      }}
      onPointerDown={(e) => {
        swipe.current = { x: e.clientX, y: e.clientY };
        if (scale > 1.05) {
          dragging.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
        }
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        setPan({
          x: dragging.current.panX + (e.clientX - dragging.current.x),
          y: dragging.current.panY + (e.clientY - dragging.current.y),
        });
      }}
      onPointerUp={(e) => {
        const start = swipe.current;
        dragging.current = null;
        swipe.current = null;
        if (!multi || scale > 1.05 || !start) return;
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) <= Math.abs(dy) * 1.2) return;
        goTo(dx < 0 ? photoIndex + 1 : photoIndex - 1);
      }}
    >
      <div className="absolute inset-0 origin-center" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current?.imageUrl || ""} alt="" className="h-full w-full object-contain" draggable={false} />
        {visible.map((item) => {
          const isSelected = selected?.id === item.id;
          const sold = isUnavailable(item.status);
          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.title}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => selectItem(item)}
              className="absolute z-10 cursor-pointer border-0 bg-transparent p-0"
              style={{
                left: `${item.x * 100}%`,
                top: `${item.y * 100}%`,
                width: `${item.width * 100}%`,
                height: `${item.height * 100}%`,
              }}
            >
              {/* Invisible hit area = vendor's box; price / Sold tag sits near the top */}
              <span
                className={`absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold shadow-md transition-transform pointer-events-none ${
                  sold
                    ? `bg-clay text-white ${isSelected ? "scale-110 ring-2 ring-white" : ""}`
                    : isSelected
                      ? "scale-110 bg-gold text-ink ring-2 ring-white"
                      : "bg-gold text-ink"
                }`}
              >
                {tagLabel(item)}
              </span>
            </button>
          );
        })}
      </div>
      {navArrows}
      {dots}
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
          <div className={`mt-2 text-2xl font-bold ${isUnavailable(selected.status) ? "text-clay" : "text-ocean"}`}>
            {isUnavailable(selected.status)
              ? "Sold"
              : selected.priceCents === 0
                ? "FREE"
                : formatMoney(selected.priceCents)}
          </div>
          {selected.condition && <p className="mt-2 text-sm text-muted">Condition: {selected.condition}</p>}
          {fulfillmentNote && !isUnavailable(selected.status) && (
            <p className="mt-3 rounded-2xl bg-sand px-3 py-2 text-sm">{fulfillmentNote}</p>
          )}
          {isUnavailable(selected.status) ? (
            <p className="mt-4 rounded-2xl bg-clay/10 px-4 py-3 text-sm font-semibold text-clay">This item has sold.</p>
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
          {showMessage && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  const id = await startMessage(selected.id, message);
                  router.push(`/messages/${id}`);
                });
              }}
              className="mt-3 rounded-2xl bg-sand p-3"
            >
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={pending}
                className="mt-2 w-full rounded-xl bg-ink py-2.5 text-sm font-semibold text-white"
              >
                Message Seller
              </button>
            </form>
          )}
          <p className="mt-4 text-xs text-muted">
            {multi
              ? "Swipe or use the arrows for another photo. Tap an item to switch."
              : "Tap an item in the photo (or its price tag) to switch."}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted">
          {multi ? "Swipe or use the arrows for another photo, or tap an item." : "Tap an item in the photo to see details."}
        </p>
      )}
    </div>
  );

  return (
    <>
      <div className="grid items-start gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="relative aspect-[4/3] w-full self-start overflow-hidden rounded-[28px] bg-ink">
          {stage("h-full w-full")}
          <div className="absolute right-3 top-3 z-20 flex items-center gap-1.5">
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
          {multi && (
            <div className="absolute left-3 top-3 z-20 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white">
              {photoIndex + 1} / {gallery.length}
            </div>
          )}
        </div>
        <div className="lg:sticky lg:top-4 lg:self-start">{detailPanel}</div>
      </div>

      {selected && (
        <section className="mt-6 rounded-3xl bg-white p-6 card-shadow">
          <h2 className="font-display text-2xl">Description</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{selected.description || "See photo."}</p>
        </section>
      )}

      {expanded && (
        <div className="fixed inset-0 z-[60] flex bg-black/95 backdrop-blur-sm">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
              <span className="hidden text-sm text-white/70 sm:block">
                {multi
                  ? "Swipe or arrows for more photos · tap an item · +/− to zoom"
                  : "Tap an item or price tag · scroll or use +/− to zoom · drag to pan"}
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
