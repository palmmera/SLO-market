import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { HotspotEditor } from "@/components/hotspot/editor";
import { refreshStripeStatus } from "@/actions/orders";

export default async function FoodPhotoEditorPage({
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

  const [collection, stripeAccount, profile] = await Promise.all([
    prisma.collection.findFirst({
      where: { id, sellerId: session.user.id, type: "PRODUCE_STAND" },
      include: {
        images: {
          orderBy: { sortOrder: "asc" },
          include: {
            hotspots: { include: { listing: true } },
          },
        },
      },
    }),
    prisma.stripeAccount.findUnique({ where: { userId: session.user.id } }),
    prisma.foodSellerProfile.findUnique({ where: { userId: session.user.id } }),
  ]);
  if (profile?.status !== "ACTIVE") redirect("/dashboard/food-seller");
  if (!collection) notFound();
  const image = collection.images.find((i) => i.id === sp.image) || collection.images[0];
  if (!image) notFound();
  const categoryId =
    sp.category || (await prisma.category.findFirst({ where: { slug: "local-produce" } }))?.id;
  if (!categoryId) notFound();

  const stripeReady =
    stripeAccount?.status === "PAYOUTS_ENABLED" && Boolean(stripeAccount.payoutsEnabled);

  return (
    <div className="mx-auto max-w-3xl px-4 py-4">
      <Link href="/sell/food" className="text-sm font-semibold text-ocean">
        ← Local food &amp; produce
      </Link>
      <h1 className="mt-2 font-display text-3xl">{collection.title}</h1>
      <p className="mb-4 text-sm text-muted">Tap each item on your stand. Drag corners to fit the box, then set price and product type.</p>
      {!stripeReady && (
        <div className="mb-4 rounded-2xl bg-gold/20 p-4 text-sm">
          Mark items now. When you save, you&apos;ll connect Stripe so buyers can pay you.{" "}
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
        mode="produce"
        collectionId={collection.id}
        collectionSlug={collection.slug}
        imageId={image.id}
        categoryId={categoryId}
        imageUrl={image.originalUrl}
        returnPath={`/sell/food/photo/${collection.id}?image=${image.id}&category=${categoryId}`}
        initialFulfillment={collection.fulfillment}
        initialDeliveryFeeCents={collection.deliveryFeeCents}
        initialDeliveryRadiusMiles={collection.deliveryRadiusMiles}
        initialHideSold={collection.hideSold}
        initialItems={image.hotspots.map((h) => ({
          listingId: h.listing.id,
          slug: h.listing.slug,
          title: h.listing.title,
          priceCents: h.listing.priceCents,
          description: h.listing.description,
          condition: h.listing.condition || "GOOD",
          status: h.listing.status,
          produceProductType:
            typeof h.listing.extraDetails === "object" &&
            h.listing.extraDetails &&
            "produceProductType" in (h.listing.extraDetails as object)
              ? String((h.listing.extraDetails as { produceProductType?: string }).produceProductType)
              : "FRESH_PRODUCE",
          box: { x: h.x, y: h.y, width: h.width, height: h.height },
        }))}
        images={collection.images.map((img) => ({
          id: img.id,
          imageUrl: img.originalUrl,
          items: img.hotspots.map((h) => ({
            listingId: h.listing.id,
            slug: h.listing.slug,
            title: h.listing.title,
            priceCents: h.listing.priceCents,
            description: h.listing.description,
            condition: h.listing.condition || "GOOD",
            status: h.listing.status,
            produceProductType:
              typeof h.listing.extraDetails === "object" &&
              h.listing.extraDetails &&
              "produceProductType" in (h.listing.extraDetails as object)
                ? String((h.listing.extraDetails as { produceProductType?: string }).produceProductType)
                : "FRESH_PRODUCE",
            box: { x: h.x, y: h.y, width: h.width, height: h.height },
          })),
        }))}
      />
    </div>
  );
}
