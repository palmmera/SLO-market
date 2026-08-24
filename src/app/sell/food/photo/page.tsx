import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PhotoSaleStart } from "@/components/hotspot/start";

export default async function SellFoodPhotoPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login?callbackUrl=/sell/food/photo");

  const [cities, user, profile, produceParent] = await Promise.all([
    prisma.city.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.foodSellerProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.category.findFirst({ where: { slug: "local-produce" } }),
  ]);

  if (profile?.status !== "ACTIVE") redirect("/dashboard/food-seller");
  if (!produceParent) redirect("/sell/food");

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <Link href="/sell/food" className="text-sm font-semibold text-ocean">
        ← Local food &amp; produce
      </Link>
      <h1 className="mt-3 font-display text-4xl">Produce stand photo</h1>
      <p className="mt-2 text-muted">
        Photograph your stand or table. Tap each item, set a price, and buyers pick from the picture — just like a garage sale photo.
      </p>
      <div className="mt-6">
        <PhotoSaleStart
          variant="produce"
          cities={cities}
          defaultCityId={user?.cityId || cities[0]?.id}
          produceCategoryId={produceParent.id}
        />
      </div>
    </div>
  );
}
