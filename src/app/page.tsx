import Link from "next/link";
import { SearchHero } from "@/components/search-hero";
import { CategoryGrid } from "@/components/category-grid";
import { ListingGrid, type CollectionCardData } from "@/components/listing-card";
import { prisma, safeDb } from "@/lib/db";
import { getActiveGarageSales, getActiveListings, getActiveProduceStands } from "@/lib/listings";
import { ListingStatus, ListingType } from "@prisma/client";
import { SAFETY_TIPS, MARKETPLACE_DISCLAIMER } from "@/lib/constants";

function toCollectionCards(
  rows: Awaited<ReturnType<typeof getActiveGarageSales>>,
): CollectionCardData[] {
  return rows.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    city: c.city,
    itemCount: c.listings.length,
    lowestPriceCents: c.listings.length
      ? Math.min(...c.listings.map((l) => l.priceCents))
      : null,
    imageUrl: c.images[0]?.displayUrl || c.images[0]?.originalUrl || null,
  }));
}

export default async function HomePage() {
  const empty: never[] = [];
  const [categories, cities, recent, produce, produceStands, free, rentals, featured, popular, garageSales] = await Promise.all([
    safeDb(
      () => prisma.category.findMany({ where: { parentId: null, isActive: true }, orderBy: { sortOrder: "asc" } }),
      empty,
    ),
    safeDb(() => prisma.city.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }), empty),
    safeDb(() => getActiveListings({}, 8), empty),
    safeDb(
      () =>
        prisma.listing.findMany({
          where: { status: ListingStatus.ACTIVE, collectionId: null, category: { isProduce: true } },
          include: { city: true, images: { orderBy: { sortOrder: "asc" }, take: 1 } },
          orderBy: { publishedAt: "desc" },
          take: 8,
        }),
      empty,
    ),
    safeDb(() => getActiveProduceStands(4), empty),
    safeDb(() => getActiveListings({ listingType: ListingType.FREE }, 8), empty),
    safeDb(() => getActiveListings({ listingType: ListingType.RENTAL }, 8), empty),
    safeDb(
      () =>
        prisma.listing.findMany({
          where: { status: ListingStatus.ACTIVE, collectionId: null, isFeatured: true },
          include: { city: true, images: { orderBy: { sortOrder: "asc" }, take: 1 } },
          orderBy: { publishedAt: "desc" },
          take: 8,
        }),
      empty,
    ),
    safeDb(
      () =>
        prisma.listing.findMany({
          where: { status: ListingStatus.ACTIVE, collectionId: null },
          include: { city: true, images: { orderBy: { sortOrder: "asc" }, take: 1 } },
          orderBy: [{ favoriteCount: "desc" }, { viewCount: "desc" }],
          take: 8,
        }),
      empty,
    ),
    safeDb(() => getActiveGarageSales(6), empty),
  ]);

  const collectionCards = toCollectionCards(garageSales);
  const produceStandCards = toCollectionCards(produceStands);

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-6">
      <SearchHero />

      <section>
        <SectionHead title="Popular Categories" href="/browse" />
        <CategoryGrid categories={categories.filter((c) => c.slug !== "other")} />
      </section>

      <section>
        <SectionHead title="Recently Listed" href="/browse?sort=newest" />
        <ListingGrid listings={recent} collections={collectionCards} />
      </section>

      <section>
        <SectionHead title="Popular Near You" href="/browse?sort=popular" />
        <ListingGrid listings={popular} />
      </section>

      <section>
        <SectionHead title="Free Stuff" href="/free-stuff" />
        <ListingGrid listings={free} />
      </section>

      <section>
        <SectionHead title="Rentals" href="/rentals" />
        <ListingGrid listings={rentals} />
      </section>

      <section>
        <SectionHead title="Local Produce" href="/local-produce" />
        <p className="mb-4 text-sm text-muted">Fresh from SLO County gardens and farms. Please follow local produce and cottage-food rules.</p>
        <ListingGrid listings={produce} collections={produceStandCards} />
      </section>

      {featured.length > 0 && (
        <section>
          <SectionHead title="Featured Listings" href="/browse?featured=1" />
          <ListingGrid listings={featured} />
        </section>
      )}

      <section>
        <SectionHead title="Browse by City" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {cities.map((city) => (
            <Link key={city.id} href={`/${city.slug}`} className="rounded-2xl bg-white px-4 py-3 text-sm font-medium card-shadow">
              {city.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] bg-clay px-6 py-10 text-white md:px-10">
        <h2 className="font-display text-3xl md:text-5xl">Got something to sell?</h2>
        <p className="mt-2 max-w-lg text-white/90">Basic listings are free. Upload photos, add a price, choose pickup or local delivery, and publish in a few minutes.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/sell" className="rounded-full bg-white px-5 py-3 font-semibold text-ink">
            Sell Something
          </Link>
          <Link href="/sell/food" className="rounded-full border border-white/40 px-5 py-3 font-semibold">
            Sell local food
          </Link>
        </div>
      </section>

      <section className="rounded-[28px] bg-white p-6 card-shadow md:p-8">
        <h2 className="font-display text-2xl">Safety tips</h2>
        <ul className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          {SAFETY_TIPS.map((tip) => (
            <li key={tip} className="rounded-2xl bg-sand px-4 py-3">
              {tip}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted">{MARKETPLACE_DISCLAIMER}</p>
        <Link href="/safety" className="mt-3 inline-block text-sm font-semibold text-ocean">
          Read community safety guidelines
        </Link>
      </section>
    </div>
  );
}

function SectionHead({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <h2 className="font-display text-2xl md:text-3xl">{title}</h2>
      {href && (
        <Link href={href} className="text-sm font-medium text-ocean">
          See all
        </Link>
      )}
    </div>
  );
}
