import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EditListingForm } from "@/components/edit-listing-form";
import { ListingStatus } from "@prisma/client";

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard");
  const { id } = await params;

  const [listing, categories, cities] = await Promise.all([
    prisma.listing.findFirst({
      where: {
        id,
        sellerId: session.user.id,
        status: { in: [ListingStatus.ACTIVE, ListingStatus.DRAFT, ListingStatus.RESERVED] },
      },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        category: true,
      },
    }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.city.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  if (!listing) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/dashboard" className="text-sm font-semibold text-ocean">
        ← Back to dashboard
      </Link>
      <h1 className="mt-3 font-display text-4xl">Edit listing</h1>
      <p className="mt-2 text-muted">Update your photos, details, price, and delivery options.</p>
      <div className="mt-6">
        <EditListingForm
          categories={categories}
          cities={cities}
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
