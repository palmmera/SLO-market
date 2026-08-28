import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ListingGrid } from "@/components/listing-card";

export default async function FavoritesPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  const favorites = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    include: { listing: { include: { city: true, images: { take: 1, orderBy: { sortOrder: "asc" } }, category: { select: { slug: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 font-display text-4xl">My Favorites</h1>
      <p className="mb-6 text-sm text-muted">We’ll notify you if a saved listing’s price changes, sells, or is removed.</p>
      <ListingGrid listings={favorites.map((f) => f.listing)} />
    </div>
  );
}
