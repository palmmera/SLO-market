import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { InteractivePhotoViewer } from "@/components/hotspot/viewer";
import { formatCityCounty, conditionLabel } from "@/lib/utils";

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
        include: {
          hotspots: { include: { listing: true } },
        },
      },
    },
  });
  if (!collection || collection.status === "REMOVED") notFound();
  const image = collection.images[0];
  const isOwner = session?.user?.id === collection.sellerId;
  const editQs = new URLSearchParams();
  if (image?.id) editQs.set("image", image.id);
  const firstCategory = image?.hotspots[0]?.listing.categoryId;
  if (firstCategory) editQs.set("category", firstCategory);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <p className="text-xs uppercase tracking-[0.2em] text-ocean">{formatCityCounty(collection.city.name)}</p>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">{collection.title}</h1>
          <p className="mt-1 text-sm text-muted">
            Tap an item in the photo — details and price update here. Buy the selected item.
          </p>
        </div>
        {isOwner && (
          <Link
            href={`/sell/photo/${collection.id}?${editQs.toString()}`}
            className="rounded-full bg-ocean px-4 py-2 text-sm font-semibold text-white"
          >
            Edit garage sale
          </Link>
        )}
      </div>
      {image && (
        <div className="mt-5">
          <InteractivePhotoViewer
            imageUrl={image.originalUrl || image.displayUrl || ""}
            hideSold={collection.hideSold}
            initialItemSlug={sp.item}
            items={image.hotspots.map((h) => ({
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
            }))}
          />
        </div>
      )}
    </div>
  );
}
