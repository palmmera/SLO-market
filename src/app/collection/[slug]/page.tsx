import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { InteractivePhotoViewer } from "@/components/hotspot/viewer";
import { formatCityCounty } from "@/lib/utils";

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const collection = await prisma.collection.findUnique({
    where: { slug: (await params).slug },
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
  if (!collection) notFound();
  const image = collection.images[0];
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <p className="text-xs uppercase tracking-[0.2em] text-ocean">{formatCityCounty(collection.city.name)}</p>
      <h1 className="font-display text-4xl">{collection.title}</h1>
      <p className="mt-1 text-sm text-muted">Tap an item in the photo to see the price.</p>
      {image && (
        <div className="mt-5">
          <InteractivePhotoViewer
            imageUrl={image.originalUrl}
            hideSold={collection.hideSold}
            items={image.hotspots.map((h) => ({
              id: h.listing.id,
              slug: h.listing.slug,
              title: h.listing.title,
              priceCents: h.listing.priceCents,
              description: h.listing.description,
              status: h.listing.status,
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
