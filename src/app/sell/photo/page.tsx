import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PhotoSaleStart } from "@/components/hotspot/start";

export default async function SellPhotoPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login?callbackUrl=/sell/photo");
  const [cities, categories, user] = await Promise.all([
    prisma.city.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.user.findUnique({ where: { id: session.user.id } }),
  ]);
  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <h1 className="font-display text-4xl">Sell from a photo or video</h1>
      <p className="mt-2 text-muted">
        Upload a photo, or a short clip up to 20 seconds. Tap each item, adjust the box, add a price.
      </p>
      <div className="mt-6">
        <PhotoSaleStart cities={cities} categories={categories} defaultCityId={user?.cityId || cities[0]?.id} />
      </div>
    </div>
  );
}
