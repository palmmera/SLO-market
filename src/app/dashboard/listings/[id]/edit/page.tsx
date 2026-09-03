import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EditListingForm } from "@/components/edit-listing-form";
import { ListingStatus } from "@prisma/client";
import { refreshStripeStatus } from "@/actions/orders";
import { revalidatePath } from "next/cache";
import { parseCustomCategory, parseDepositNote } from "@/lib/utils";
import { tryShareListingOnFacebook } from "@/lib/facebook-page";

export default async function EditListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ stripe?: string }>;
}) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard");
  const { id } = await params;
  const sp = await searchParams;

  if (sp.stripe === "return" || sp.stripe === "refresh") {
    await refreshStripeStatus().catch(() => null);
  }

  const [listing, categories, cities, stripeAccount] = await Promise.all([
    prisma.listing.findFirst({
      where: {
        id,
        sellerId: session.user.id,
        status: { in: [ListingStatus.ACTIVE, ListingStatus.DRAFT, ListingStatus.RESERVED] },
      },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        category: true,
        hotspot: true,
        collection: { include: { images: { take: 1 } } },
      },
    }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.city.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.stripeAccount.findUnique({ where: { userId: session.user.id } }),
  ]);

  if (!listing) notFound();

  // Garage / photo-sale items are edited on the shared photo editor (add/remove items).
  if (listing.collectionId && listing.collection) {
    const imageId = listing.hotspot?.collectionImageId || listing.collection.images[0]?.id;
    const qs = new URLSearchParams();
    if (imageId) qs.set("image", imageId);
    qs.set("category", listing.categoryId);
    const base =
      listing.collection.type === "PRODUCE_STAND"
        ? `/sell/food/photo/${listing.collectionId}`
        : `/sell/photo/${listing.collectionId}`;
    redirect(`${base}?${qs.toString()}`);
  }

  const stripeReady =
    stripeAccount?.status === "PAYOUTS_ENABLED" && Boolean(stripeAccount.payoutsEnabled);

  if (sp.stripe === "return" && stripeReady && listing.status === ListingStatus.DRAFT) {
    await prisma.listing.update({
      where: { id: listing.id },
      data: { status: ListingStatus.ACTIVE, publishedAt: listing.publishedAt ?? new Date() },
    });
    revalidatePath("/");
    revalidatePath("/browse");
    revalidatePath("/dashboard");
    await tryShareListingOnFacebook(listing.id);
    redirect(`/listing/${listing.slug}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/dashboard" className="text-sm font-semibold text-ocean">
        ← Back to dashboard
      </Link>
      <h1 className="mt-3 font-display text-4xl">
        {listing.status === ListingStatus.DRAFT ? "Finish listing" : "Edit listing"}
      </h1>
      <p className="mt-2 text-muted">
        {listing.status === ListingStatus.DRAFT
          ? "Your details are saved as a draft. Finish Stripe to publish, or keep editing below."
          : "Update your photos, details, price, and delivery options."}
      </p>
      {listing.status === ListingStatus.DRAFT && !stripeReady && (
        <div className="mt-4 rounded-2xl bg-gold/20 p-4 text-sm">
          {sp.stripe === "return" || sp.stripe === "refresh"
            ? "Stripe setup isn’t finished yet. Save again to continue Stripe onboarding, or use Manage Stripe."
            : "Connect Stripe to publish this listing so buyers can pay you through SLO Market."}{" "}
          <Link href="/dashboard/stripe" className="font-semibold text-ocean">
            Manage Stripe
          </Link>
        </div>
      )}
      <div className="mt-6">
        <EditListingForm
          categories={categories}
          cities={cities}
          stripeReady={stripeReady}
          isDraft={listing.status === ListingStatus.DRAFT}
          listing={{
            id: listing.id,
            title: listing.title,
            description: listing.description,
            listingType: listing.listingType,
            condition: listing.condition,
            priceCents: listing.priceCents,
            categoryId: listing.categoryId,
            cityId: listing.cityId,
            fulfillment: listing.fulfillment,
            deliveryRadiusMiles: listing.deliveryRadiusMiles,
            deliveryFeeCents: listing.deliveryFeeCents,
            freeDelivery: listing.freeDelivery,
            categoryParentId: listing.category.parentId,
            depositNote: parseDepositNote(listing.extraDetails),
            customCategory: parseCustomCategory(listing.extraDetails),
            images: listing.images.map((img) => ({
              id: img.id,
              url: img.url,
              thumbnailUrl: img.thumbnailUrl,
            })),
          }}
        />
      </div>
    </div>
  );
}
