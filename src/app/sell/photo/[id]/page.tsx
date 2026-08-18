import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { HotspotEditor } from "@/components/hotspot/editor";

export default async function PhotoEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ image?: string; category?: string }>;
}) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const sp = await searchParams;
  const collection = await prisma.collection.findFirst({
    where: { id, sellerId: session.user.id },
    include: {
      images: {
        include: {
          hotspots: { include: { listing: true } },
        },
      },
    },
  });
  if (!collection) notFound();
  const image = collection.images.find((i) => i.id === sp.image) || collection.images[0];
  if (!image) notFound();
  const categoryId = sp.category || (await prisma.category.findFirst({ where: { slug: "other" } }))?.id;
  if (!categoryId) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-4">
      <h1 className="font-display text-3xl">{collection.title}</h1>
      <p className="mb-4 text-sm text-muted">Pinch or use zoom. Tap an item. Drag corners to fit the box.</p>
      <HotspotEditor
        collectionId={collection.id}
        imageId={image.id}
        categoryId={categoryId}
        imageUrl={image.originalUrl}
        initialItems={image.hotspots.map((h) => ({
          listingId: h.listing.id,
          slug: h.listing.slug,
          title: h.listing.title,
          priceCents: h.listing.priceCents,
          description: h.listing.description,
          condition: h.listing.condition || "GOOD",
          status: h.listing.status,
          box: { x: h.x, y: h.y, width: h.width, height: h.height },
        }))}
      />
    </div>
  );
}
