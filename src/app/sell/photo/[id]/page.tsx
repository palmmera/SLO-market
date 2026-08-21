import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { HotspotEditor } from "@/components/hotspot/editor";
import { refreshStripeStatus } from "@/actions/orders";

export default async function PhotoEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ image?: string; category?: string; stripe?: string }>;
}) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const sp = await searchParams;

  if (sp.stripe === "return" || sp.stripe === "refresh") {
    await refreshStripeStatus().catch(() => null);
  }

  const [collection, stripeAccount] = await Promise.all([
    prisma.collection.findFirst({
      where: { id, sellerId: session.user.id },
      include: {
        images: {
          include: {
            hotspots: { include: { listing: true } },
          },
        },
      },
    }),
    prisma.stripeAccount.findUnique({ where: { userId: session.user.id } }),
  ]);
  if (!collection) notFound();
  const image = collection.images.find((i) => i.id === sp.image) || collection.images[0];
  if (!image) notFound();
  const categoryId = sp.category || (await prisma.category.findFirst({ where: { slug: "other" } }))?.id;
  if (!categoryId) notFound();

  const stripeReady =
    stripeAccount?.status === "PAYOUTS_ENABLED" && Boolean(stripeAccount.payoutsEnabled);

  return (
    <div className="mx-auto max-w-3xl px-4 py-4">
      <h1 className="font-display text-3xl">{collection.title}</h1>
      <p className="mb-4 text-sm text-muted">Pinch or use zoom. Tap an item. Drag corners to fit the box.</p>
      {!stripeReady && (
        <div className="mb-4 rounded-2xl bg-gold/20 p-4 text-sm">
          You can mark items on the photo now. When you save an item, you’ll finish connecting Stripe so buyers can pay
          you.{" "}
          <Link href="/dashboard/stripe" className="font-semibold text-ocean">
            Manage Stripe
          </Link>
        </div>
      )}
      {stripeReady && sp.stripe === "return" && (
        <div className="mb-4 rounded-2xl bg-ocean-light p-4 text-sm text-ocean-dark">
          Stripe is connected. Tap an item and save to list it.
        </div>
      )}
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
