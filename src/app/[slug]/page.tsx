import { notFound } from "next/navigation";
import { prisma, safeDb } from "@/lib/db";
import { ListingGrid, type CollectionCardData } from "@/components/listing-card";
import { getActiveGarageSales, getActiveProduceStands } from "@/lib/listings";
import { ListingStatus } from "@prisma/client";
import { RESERVED_PATHS } from "@/lib/constants";
import { isServiceSlug } from "@/lib/utils";
import type { Metadata } from "next";

function toCollectionCards(rows: Awaited<ReturnType<typeof getActiveGarageSales>>): CollectionCardData[] {
  return rows.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    city: c.city,
    itemCount: c.listings.length,
    lowestPriceCents: c.listings.length ? Math.min(...c.listings.map((l) => l.priceCents)) : null,
    imageUrl: c.images[0]?.displayUrl || c.images[0]?.originalUrl || null,
    exploreVideo: Boolean(c.images[0]?.videoUrl),
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const city = await safeDb(() => prisma.city.findUnique({ where: { slug } }), null);
  if (city) {
    return { title: city.seoTitle || `${city.name} Marketplace`, description: city.seoDescription || undefined };
  }
  const category = await safeDb(() => prisma.category.findUnique({ where: { slug } }), null);
  if (category) {
    return { title: category.seoTitle || category.name, description: category.seoDescription || undefined };
  }
  return { title: "Browse" };
}

export default async function SeoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (RESERVED_PATHS.has(slug)) notFound();

  const city = await safeDb(() => prisma.city.findUnique({ where: { slug } }), null);
  if (city) {
    const listings = await safeDb(
      () =>
        prisma.listing.findMany({
          where: { status: ListingStatus.ACTIVE, collectionId: null, cityId: city.id },
          include: { city: true, images: { orderBy: { sortOrder: "asc" }, take: 1 }, category: { select: { slug: true } } },
          orderBy: { publishedAt: "desc" },
          take: 48,
        }),
      [],
    );
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

  const category = await safeDb(
    () => prisma.category.findUnique({ where: { slug }, include: { children: true, parent: true } }),
    null,
  );
  if (!category) notFound();

  const ids = [category.id, ...category.children.map((c) => c.id)];

  // Garage / photo sales are Collections — show them on the Garage Sale category page.
  if (category.slug === "garage-sale") {
    const garageSales = await safeDb(() => getActiveGarageSales(48), []);
    const collectionCards = toCollectionCards(garageSales);
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="font-display text-4xl">{category.name}</h1>
        {category.description && <p className="mt-2 text-muted">{category.description}</p>}
        <p className="mt-3 text-sm text-muted">Tap a price tag on the photo to browse items in each sale.</p>
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
          <ListingGrid listings={[]} collections={collectionCards} />
        </div>
      </div>
    );
  }

  const listings = await safeDb(
    () =>
      prisma.listing.findMany({
        where: {
          status: ListingStatus.ACTIVE,
          collectionId: null,
          ...(category.isFree
            ? { listingType: "FREE" }
            : {
                categoryId: { in: ids },
                ...(category.isService || category.slug === "services" || category.parent?.isService || isServiceSlug(category.slug)
                  ? { listingType: "SERVICE" as const }
                  : category.isRental
                    ? { listingType: "RENTAL" as const }
                    : {}),
              }),
        },
        include: { city: true, images: { orderBy: { sortOrder: "asc" }, take: 1 }, category: { select: { slug: true } } },
        orderBy: { publishedAt: "desc" },
        take: 48,
      }),
    [],
  );

  const produceStands = category.isProduce
    ? toCollectionCards(await safeDb(() => getActiveProduceStands(48), []))
    : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-4xl">{category.name}</h1>
      {category.description && <p className="mt-2 text-muted">{category.description}</p>}
      {category.isProduce && (
        <p className="mt-3 rounded-2xl bg-ocean-light px-4 py-3 text-sm text-ocean-dark">
          Local produce only. Sellers are responsible for following California and San Luis Obispo County rules for agricultural and cottage-food sales. SLO Marketplace does not inspect or certify food.
        </p>
      )}
      {(category.isService || category.slug === "services" || isServiceSlug(category.slug)) && (
        <p className="mt-3 text-sm text-muted">Local services from neighbors. Message the provider to arrange details, scheduling, and payment.</p>
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
      {produceStands.length > 0 && (
        <>
          <h2 className="mt-8 font-display text-2xl">Produce stands</h2>
          <p className="mt-1 text-sm text-muted">Tap a price on the photo to browse items at each stand.</p>
          <div className="mt-4">
            <ListingGrid listings={[]} collections={produceStands} />
          </div>
        </>
      )}
      <h2 className={`font-display text-2xl ${produceStands.length ? "mt-8" : "mt-8"}`}>
        {produceStands.length ? "Individual listings" : ""}
      </h2>
      {!produceStands.length && <div className="mt-8" />}
      <div className={produceStands.length ? "mt-4" : "mt-8"}>
        <ListingGrid listings={listings} />
      </div>
    </div>
  );
}
