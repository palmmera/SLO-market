import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { InteractivePhotoViewer } from "@/components/hotspot/viewer";
import { formatCityCounty, conditionLabel, formatMoney } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const collection = await prisma.collection.findUnique({
    where: { slug: (await params).slug },
    include: { city: true, images: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });
  if (!collection) return { title: "Sale" };
  const image = collection.images[0]?.displayUrl || collection.images[0]?.originalUrl;
  const kind = collection.type === "PRODUCE_STAND" ? "Produce stand" : "Garage sale";
  return {
    title: collection.title,
    description: `${kind} in ${collection.city.name}, San Luis Obispo County.`,
    openGraph: {
      title: collection.title,
      description: `${kind} in ${collection.city.name}, San Luis Obispo County.`,
      images: image ? [image] : undefined,
    },
  };
}

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ item?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const session = await getSession();

  const collection = await prisma.collection.findUnique({
    where: { slug },
    include: {
      city: true,
      seller: true,
      images: {
        orderBy: { sortOrder: "asc" },
        include: {
          hotspots: { include: { listing: true } },
        },
      },
    },
  });
  if (!collection || collection.status === "REMOVED") notFound();
  const itemImage = sp.item
    ? collection.images.find((img) => img.hotspots.some((h) => h.listing.slug === sp.item))
    : undefined;
  const image = itemImage || collection.images[0];
  const isOwner = session?.user?.id === collection.sellerId;
  const editQs = new URLSearchParams();
  if (image?.id) editQs.set("image", image.id);
  const firstCategory =
    image?.hotspots[0]?.listing.categoryId ||
    collection.images.flatMap((img) => img.hotspots)[0]?.listing.categoryId;
  if (firstCategory) editQs.set("category", firstCategory);

  const isProduceStand = collection.type === "PRODUCE_STAND";
  const editBase = isProduceStand ? `/sell/food/photo/${collection.id}` : `/sell/photo/${collection.id}`;

  const fulfillmentNote =
    collection.fulfillment === "LOCAL_DELIVERY"
      ? collection.deliveryFeeCents === 0
        ? `Free local delivery${collection.deliveryRadiusMiles ? ` within ${collection.deliveryRadiusMiles} miles` : ""} — or arrange pickup with the seller.`
        : `Local delivery ${formatMoney(collection.deliveryFeeCents)}${collection.deliveryRadiusMiles ? ` within ${collection.deliveryRadiusMiles} miles` : ""} — or arrange pickup with the seller.`
      : "Pickup only — arrange a public meetup after purchase. Exact address is not shown.";

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <p className="text-xs uppercase tracking-[0.2em] text-ocean">{formatCityCounty(collection.city.name)}</p>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">{collection.title}</h1>
          <p className="mt-1 text-sm text-muted">
            Tap a price tag — details and price update here. If there are more photos, swipe or use the arrows.
          </p>
          <p className="mt-2 inline-block rounded-full bg-sand px-3 py-1 text-xs font-medium text-ink">{fulfillmentNote}</p>
        </div>
        {isOwner && (
          <Link
            href={`${editBase}?${editQs.toString()}`}
            className="rounded-full bg-ocean px-4 py-2 text-sm font-semibold text-white"
          >
            {isProduceStand ? "Edit produce stand" : "Edit garage sale"}
          </Link>
        )}
      </div>
      {collection.images.length > 0 && (
        <div className="mt-5">
          <InteractivePhotoViewer
            initialItemSlug={sp.item}
            showMessage={!isOwner}
            sellerName={collection.seller.name}
            fulfillmentNote={fulfillmentNote}
            photos={collection.images.map((img) => ({
              imageUrl: img.originalUrl || img.displayUrl || "",
              items: img.hotspots.map((h) => ({
                id: h.listing.id,
                slug: h.listing.slug,
                title: h.listing.title,
                priceCents: h.listing.priceCents,
                description: h.listing.description,
                status: h.listing.status,
                condition: h.listing.condition ? conditionLabel(h.listing.condition) : null,
                x: h.x,
                y: h.y,
                width: h.width,
                height: h.height,
                markerLabel: h.markerLabel,
              })),
            }))}
          />
        </div>
      )}
    </div>
  );
}
