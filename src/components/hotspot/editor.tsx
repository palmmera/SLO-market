"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveHotspotItem, deleteHotspotItem, markHotspotSold } from "@/actions/hotspots";
import { connectStripeAccount } from "@/actions/orders";
import { HOTSPOT_CONDITIONS } from "@/lib/constants";
import { PRODUCE_PRODUCT_TYPES, produceTypeRequiresPermit } from "@/lib/food-seller";
import { formatMoney } from "@/lib/utils";
import { ProduceProductType } from "@prisma/client";

type Box = { x: number; y: number; width: number; height: number };
type Suggestion = { id: string; label: string; score: number; box: Box };

const FRAME_ASPECT = 4 / 3;

function titleCase(label: string) {
  return label.replace(/\b\w/g, (c) => c.toUpperCase());
}

// Convert a box in image-content space (0-1) to the editor frame space (0-1),
// accounting for object-contain letterboxing inside the fixed 4:3 frame.
function imageToFrame(nx: number, ny: number, nw: number, nh: number, imgAspect: number): Box {
  if (imgAspect > FRAME_ASPECT) {
    const scale = FRAME_ASPECT / imgAspect;
    const pad = (1 - scale) / 2;
    return { x: nx, y: pad + ny * scale, width: nw, height: nh * scale };
  }
  const scale = imgAspect / FRAME_ASPECT;
  const pad = (1 - scale) / 2;
  return { x: pad + nx * scale, y: ny, width: nw * scale, height: nh };
}
type Item = {
  listingId: string;
  slug: string;
  title: string;
  priceCents: number;
  description: string;
  condition: string;
  status: string;
  produceProductType?: string;
  box: Box;
};

type Handle = "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export function HotspotEditor({
  collectionId,
  collectionSlug,
  imageId,
  categoryId,
  imageUrl,
  initialItems,
  mode = "garage",
  returnPath,
}: {
  collectionId: string;
  collectionSlug: string;
  imageId: string;
  categoryId: string;
  imageUrl: string;
  initialItems: Item[];
  mode?: "garage" | "produce";
  returnPath?: string;
}) {
  const router = useRouter();
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [items, setItems] = useState<Item[]>(initialItems);
  const [active, setActive] = useState<Box | null>(null);
  const [editing, setEditing] = useState<Item | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [pending, start] = useTransition();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [scanState, setScanState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftKey, setDraftKey] = useState(0);
  const isProduce = mode === "produce";
  const stripeReturnPath = returnPath || `/sell/photo/${collectionId}?image=${imageId}&category=${categoryId}`;

  useEffect(() => {
    let cancelled = false;
    async function scan() {
      try {
        setScanState("loading");
        const [tf, cocoSsd] = await Promise.all([
          import("@tensorflow/tfjs"),
          import("@tensorflow-models/coco-ssd"),
        ]);
        await tf.ready();
        if (cancelled) return;
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.src = imageUrl;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("image load failed"));
        });
        if (cancelled) return;
        const model = await cocoSsd.load({ base: "lite_mobilenet_v2" });
        if (cancelled) return;
        const predictions = await model.detect(img, 20);
        if (cancelled) return;
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const mapped: Suggestion[] = predictions
          .filter((p) => p.score >= 0.5)
          .map((p, i) => {
            const [bx, by, bw, bh] = p.bbox;
            const box = imageToFrame(
              bx / img.naturalWidth,
              by / img.naturalHeight,
              bw / img.naturalWidth,
              bh / img.naturalHeight,
              imgAspect,
            );
            return { id: `sug-${i}`, label: p.class, score: p.score, box };
          });
        setSuggestions(mapped);
        setScanState("done");
      } catch {
        if (!cancelled) setScanState("error");
      }
    }
    scan();
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  function openDraft(box: Box, title: string) {
    setActive(box);
    setEditing(null);
    setShowMore(false);
    setDraftTitle(title);
    setDraftKey((k) => k + 1);
  }
  const gesture = useRef<{
    type: "pan" | "box";
    handle?: Handle;
    startX: number;
    startY: number;
    panX: number;
    panY: number;
    box?: Box;
  } | null>(null);

  function relPoint(e: React.PointerEvent) {
    const rect = frameRef.current!.getBoundingClientRect();
    const px = (e.clientX - rect.left - pan.x) / scale / rect.width;
    const py = (e.clientY - rect.top - pan.y) / scale / rect.height;
    return { x: Math.min(1, Math.max(0, px)), y: Math.min(1, Math.max(0, py)) };
  }

  function addAt(e: React.PointerEvent) {
    const p = relPoint(e);
    const size = 0.16 / scale;
    openDraft(
      {
        x: Math.max(0, p.x - size / 2),
        y: Math.max(0, p.y - size / 2),
        width: Math.min(0.5, size),
        height: Math.min(0.5, size),
      },
      "",
    );
  }

  function onBoxPointer(e: React.PointerEvent, handle: Handle) {
    e.stopPropagation();
    if (!active) return;
    gesture.current = {
      type: "box",
      handle,
      startX: e.clientX,
      startY: e.clientY,
      panX: pan.x,
      panY: pan.y,
      box: { ...active },
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onMove(e: React.PointerEvent) {
    const g = gesture.current;
    if (!g) return;
    if (g.type === "pan") {
      setPan({ x: g.panX + e.clientX - g.startX, y: g.panY + e.clientY - g.startY });
      return;
    }
    if (!g.box || !frameRef.current) return;
    const rect = frameRef.current.getBoundingClientRect();
    const dx = (e.clientX - g.startX) / scale / rect.width;
    const dy = (e.clientY - g.startY) / scale / rect.height;
    let { x, y, width, height } = g.box;
    if (g.handle === "move") {
      x = Math.min(1 - width, Math.max(0, x + dx));
      y = Math.min(1 - height, Math.max(0, y + dy));
    }
    if (g.handle?.includes("e")) width = Math.min(1 - x, Math.max(0.03, width + dx));
    if (g.handle?.includes("s")) height = Math.min(1 - y, Math.max(0.03, height + dy));
    if (g.handle?.includes("w")) {
      const next = Math.min(x + width - 0.03, Math.max(0, x + dx));
      width += x - next;
      x = next;
    }
    if (g.handle?.includes("n")) {
      const next = Math.min(y + height - 0.03, Math.max(0, y + dy));
      height += y - next;
      y = next;
    }
    setActive({ x, y, width, height });
  }

  return (
    <div className="space-y-3">
      <p className="rounded-2xl bg-ocean px-4 py-3 text-sm font-medium text-white">Tap an item in the photo to add it for sale.</p>
      {scanState === "loading" && (
        <p className="rounded-2xl bg-sand px-4 py-2 text-sm text-muted">Scanning photo for items…</p>
      )}
      {scanState === "done" && suggestions.length > 0 && (
        <p className="rounded-2xl bg-ocean-light px-4 py-2 text-sm text-ocean-dark">
          Found {suggestions.length} possible item{suggestions.length > 1 ? "s" : ""}. Tap a dashed box to add it (name and price are yours to set), or tap anywhere to add your own.
        </p>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={() => setScale((s) => Math.min(6, s + 0.25))} className="rounded-full bg-white px-3 py-2 text-sm card-shadow">
          Zoom in
        </button>
        <button type="button" onClick={() => setScale((s) => Math.max(1, s - 0.25))} className="rounded-full bg-white px-3 py-2 text-sm card-shadow">
          Zoom out
        </button>
        <button
          type="button"
          onClick={() => {
            setScale(1);
            setPan({ x: 0, y: 0 });
          }}
          className="rounded-full bg-white px-3 py-2 text-sm card-shadow"
        >
          Reset
        </button>
      </div>
      <div
        ref={frameRef}
        className="relative aspect-[4/3] overflow-hidden rounded-[24px] bg-ink touch-none"
        onWheel={(e) => {
          e.preventDefault();
          setScale((s) => Math.min(6, Math.max(1, s + (e.deltaY < 0 ? 0.12 : -0.12))));
        }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).dataset.handle) return;
          if (e.shiftKey || scale > 1.05) {
            gesture.current = { type: "pan", startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
            return;
          }
          addAt(e);
        }}
        onPointerMove={onMove}
        onPointerUp={() => {
          gesture.current = null;
        }}
      >
        <div className="absolute inset-0 origin-top-left" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="h-full w-full object-contain" draggable={false} />
          {items.map((item) => (
            <button
              key={item.listingId}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                setEditing(item);
                setActive(item.box);
                setShowMore(false);
              }}
              className="absolute"
              style={{
                left: `${item.box.x * 100}%`,
                top: `${item.box.y * 100}%`,
                width: `${item.box.width * 100}%`,
                height: `${item.box.height * 100}%`,
              }}
            >
              <span className="absolute -top-3 left-0 rounded-full bg-gold px-2 py-0.5 text-[11px] font-bold">
                {item.status === "SOLD" ? "Sold" : formatMoney(item.priceCents)}
              </span>
            </button>
          ))}
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                openDraft(s.box, titleCase(s.label));
                setSuggestions((prev) => prev.filter((x) => x.id !== s.id));
              }}
              className="absolute rounded-md border-2 border-dashed border-white bg-white/10"
              style={{
                left: `${s.box.x * 100}%`,
                top: `${s.box.y * 100}%`,
                width: `${s.box.width * 100}%`,
                height: `${s.box.height * 100}%`,
              }}
            >
              <span className="absolute -top-3 left-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-ink">
                + {titleCase(s.label)}
              </span>
            </button>
          ))}
          {active && (
            <div
              className="absolute border-[3px] border-gold bg-gold/10"
              style={{
                left: `${active.x * 100}%`,
                top: `${active.y * 100}%`,
                width: `${active.width * 100}%`,
                height: `${active.height * 100}%`,
              }}
              onPointerDown={(e) => onBoxPointer(e, "move")}
            >
              {(["nw", "n", "ne", "w", "e", "sw", "s", "se"] as Handle[]).map((h) => (
                <span
                  key={h}
                  data-handle={h}
                  onPointerDown={(e) => onBoxPointer(e, h)}
                  className="absolute h-5 w-5 rounded-full bg-white shadow"
                  style={{
                    left: h.includes("w") ? "-10px" : h.includes("e") ? "calc(100% - 10px)" : "calc(50% - 10px)",
                    top: h.includes("n") ? "-10px" : h.includes("s") ? "calc(100% - 10px)" : "calc(50% - 10px)",
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {active && (
        <form
          key={editing?.listingId ?? `draft-${draftKey}`}
          className="rounded-3xl bg-white p-4 card-shadow"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            start(async () => {
              const produceProductType = String(form.get("produceProductType") || "FRESH_PRODUCE") as ProduceProductType;
              const needsPermit = isProduce && produceTypeRequiresPermit(produceProductType);
              const extra = showMore
                ? {
                    brand: String(form.get("brand") || ""),
                    model: String(form.get("model") || ""),
                    measurements: String(form.get("measurements") || ""),
                    age: String(form.get("age") || ""),
                    features: String(form.get("features") || ""),
                    defects: String(form.get("defects") || ""),
                    additionalDetails: String(form.get("additionalDetails") || ""),
                    pickupNotes: String(form.get("pickupNotes") || ""),
                  }
                : undefined;
              const saved = await saveHotspotItem({
                collectionId,
                imageId,
                categoryId,
                title: String(form.get("title")),
                price: Number(form.get("price") || 0),
                description: String(form.get("description") || ""),
                condition: String(form.get("condition") || "GOOD") as Item["condition"] as "GOOD",
                x: active.x,
                y: active.y,
                width: active.width,
                height: active.height,
                extra,
                listingId: editing?.listingId,
                produceProductType: isProduce ? produceProductType : undefined,
                permit: needsPermit
                  ? {
                      permitType: String(form.get("listingPermitType") || ""),
                      permitNumber: String(form.get("listingPermitNumber") || ""),
                      permitAgency: String(form.get("listingPermitAgency") || ""),
                      permitExpiresAt: String(form.get("listingPermitExpiresAt") || ""),
                    }
                  : undefined,
              });
              if ("needsStripeOnboarding" in saved && saved.needsStripeOnboarding) {
                const url = await connectStripeAccount({
                  returnPath: `${stripeReturnPath}&stripe=return`,
                  refreshPath: `${stripeReturnPath}&stripe=refresh`,
                });
                window.location.href = url;
                return;
              }
              if (!("listingId" in saved) || !saved.listingId || !saved.slug) return;
              const next: Item = {
                listingId: saved.listingId,
                slug: saved.slug,
                title: String(form.get("title")),
                priceCents: Math.round(Number(form.get("price") || 0) * 100),
                description: String(form.get("description") || ""),
                condition: String(form.get("condition") || "GOOD"),
                status: "ACTIVE",
                box: active,
              };
              setItems((prev) => {
                const without = prev.filter((i) => i.listingId !== saved.listingId);
                return [...without, next];
              });
              setActive(null);
              setEditing(null);
              setShowMore(false);
              setDraftTitle("");
            });
          }}
        >
          <div className="text-sm font-semibold">{editing ? "Edit item" : "This box represents the item I'm selling."}</div>
          <input name="title" required defaultValue={editing?.title ?? draftTitle} placeholder={isProduce ? "Item name, e.g. Heirloom tomatoes" : "Item name, e.g. DeWalt Drill"} className="mt-3 w-full rounded-2xl bg-sand px-4 py-3" />
          <input name="price" type="number" min="0" step="0.01" defaultValue={editing ? editing.priceCents / 100 : ""} placeholder="Price, e.g. 5" className="mt-3 w-full rounded-2xl bg-sand px-4 py-3" />
          <input name="description" defaultValue={editing?.description} placeholder={isProduce ? "Short description, e.g. Organic, picked today." : "Short description, e.g. Good working condition."} className="mt-3 w-full rounded-2xl bg-sand px-4 py-3" />
          {isProduce ? (
            <select name="produceProductType" defaultValue={editing?.produceProductType || "FRESH_PRODUCE"} className="mt-3 w-full rounded-2xl bg-sand px-4 py-3">
              {PRODUCE_PRODUCT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          ) : (
            <select name="condition" defaultValue={editing?.condition || "GOOD"} className="mt-3 w-full rounded-2xl bg-sand px-4 py-3">
              {HOTSPOT_CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          )}
          {isProduce && (
            <div className="mt-3 space-y-2 rounded-2xl bg-sand/80 p-3 text-sm">
              <p className="font-medium">Permit / registration (honey, jam, pickled &amp; other)</p>
              <input name="listingPermitType" placeholder="Permit type (if applicable)" className="w-full rounded-2xl bg-sand px-4 py-3" />
              <input name="listingPermitNumber" placeholder="Permit number" className="w-full rounded-2xl bg-sand px-4 py-3" />
              <input name="listingPermitAgency" placeholder="Issuing agency" className="w-full rounded-2xl bg-sand px-4 py-3" />
              <input name="listingPermitExpiresAt" type="date" className="w-full rounded-2xl bg-sand px-4 py-3" />
            </div>
          )}
          {!isProduce && (
          <button type="button" onClick={() => setShowMore((v) => !v)} className="mt-3 text-sm font-semibold text-ocean">
            {showMore ? "Hide extra details" : "+ Add More Information"}
          </button>
          )}
          {!isProduce && showMore && (
            <div className="mt-3 grid gap-2">
              <input name="brand" placeholder="Brand" className="rounded-2xl bg-sand px-4 py-3" />
              <input name="model" placeholder="Model" className="rounded-2xl bg-sand px-4 py-3" />
              <input name="measurements" placeholder="Measurements" className="rounded-2xl bg-sand px-4 py-3" />
              <input name="age" placeholder="Age" className="rounded-2xl bg-sand px-4 py-3" />
              <input name="features" placeholder="Features" className="rounded-2xl bg-sand px-4 py-3" />
              <input name="defects" placeholder="Defects" className="rounded-2xl bg-sand px-4 py-3" />
              <input name="additionalDetails" placeholder="Additional details" className="rounded-2xl bg-sand px-4 py-3" />
              <input name="pickupNotes" placeholder="Pickup information" className="rounded-2xl bg-sand px-4 py-3" />
            </div>
          )}
          <button disabled={pending} className="mt-4 w-full rounded-2xl bg-ocean py-3 font-semibold text-white">
            {pending ? "Saving..." : "Save Item"}
          </button>
          {editing && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="rounded-2xl bg-sand py-2 text-sm"
                onClick={() =>
                  start(async () => {
                    await markHotspotSold(editing.listingId);
                    setItems((prev) => prev.map((i) => (i.listingId === editing.listingId ? { ...i, status: "SOLD" } : i)));
                  })
                }
              >
                Mark as sold
              </button>
              <button
                type="button"
                className="rounded-2xl bg-sand py-2 text-sm text-clay"
                onClick={() =>
                  start(async () => {
                    await deleteHotspotItem(editing.listingId);
                    setItems((prev) => prev.filter((i) => i.listingId !== editing.listingId));
                    setEditing(null);
                    setActive(null);
                  })
                }
              >
                Delete item
              </button>
            </div>
          )}
        </form>
      )}

      <button
        type="button"
        onClick={() => openDraft({ x: 0.4, y: 0.4, width: 0.2, height: 0.2 }, "")}
        className="w-full rounded-2xl bg-white py-3 font-semibold card-shadow"
      >
        + Add Another Item
      </button>
      <button
        type="button"
        onClick={() => router.push(`/collection/${collectionSlug}`)}
        className="w-full rounded-2xl bg-ink py-3 font-semibold text-white"
      >
        Done
      </button>
    </div>
  );
}
