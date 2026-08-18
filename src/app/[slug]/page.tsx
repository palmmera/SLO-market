import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ListingGrid } from "@/components/listing-card";
import { ListingStatus } from "@prisma/client";
import { RESERVED_PATHS } from "@/lib/constants";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const city = await prisma.city.findUnique({ where: { slug } });
  if (city) {
    return { title: city.seoTitle || `${city.name} Marketplace`, description: city.seoDescription || undefined };
  }
  const category = await prisma.category.findUnique({ where: { slug } });
  if (category) {
    return { title: category.seoTitle || category.name, description: category.seoDescription || undefined };
  }
  return { title: "Browse" };
}

export default async function SeoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (RESERVED_PATHS.has(slug)) notFound();

  const city = await prisma.city.findUnique({ where: { slug } });
  if (city) {
    const listings = await prisma.listing.findMany({
      where: { status: ListingStatus.ACTIVE, cityId: city.id },
      include: { city: true, images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      orderBy: { publishedAt: "desc" },
      take: 48,
    });
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-xs uppercase tracking-[0.2em] text-ocean">San Luis Obispo County</p>
        <h1 className="mt-2 font-display text-4xl">{city.name}</h1>
        <p className="mt-2 max-w-2xl text-muted">Buy and sell locally in {city.name}. Keep it in SLO.</p>
        <div className="mt-8">
          <ListingGrid listings={listings} />
        </div>
      </div>
    );
  }

  const category = await prisma.category.findUnique({
    where: { slug },
    include: { children: true },
  });
  if (!category) notFound();

  const ids = [category.id, ...category.children.map((c) => c.id)];
  const listings = await prisma.listing.findMany({
    where: {
      status: ListingStatus.ACTIVE,
      ...(category.isFree ? { listingType: "FREE" } : { categoryId: { in: ids } }),
    },
    include: { city: true, images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    orderBy: { publishedAt: "desc" },
    take: 48,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-4xl">{category.name}</h1>
      {category.description && <p className="mt-2 text-muted">{category.description}</p>}
      {category.isProduce && (
        <p className="mt-3 rounded-2xl bg-ocean-light px-4 py-3 text-sm text-ocean-dark">
          Local produce only. Sellers are responsible for following California and San Luis Obispo County rules for agricultural and cottage-food sales. Do not list prohibited items.
        </p>
      )}
      {category.children.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {category.children.map((child) => (
            <a key={child.id} href={`/${child.slug}`} className="rounded-full bg-white px-3 py-1.5 text-sm card-shadow">
              {child.name}
            </a>
          ))}
        </div>
      )}
      <div className="mt-8">
        <ListingGrid listings={listings} />
      </div>
    </div>
  );
}
