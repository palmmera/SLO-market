import { prisma, safeDb } from "@/lib/db";
import { getActiveCollections, searchListings } from "@/lib/listings";
import { ListingGrid, type CollectionCardData } from "@/components/listing-card";
import { SearchHero } from "@/components/search-hero";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = String(sp.q ?? "");
  const categorySlug = String(sp.category ?? "");
  const citySlug = String(sp.city ?? "");
  const sort = String(sp.sort ?? "newest");
  const listingType = String(sp.type ?? "");
  const condition = String(sp.condition ?? "");
  const fulfillment = String(sp.fulfillment ?? "");
  const min = sp.min ? Number(sp.min) * 100 : undefined;
  const max = sp.max ? Number(sp.max) * 100 : undefined;

  const [categories, cities, category, city] = await Promise.all([
    safeDb(
      () => prisma.category.findMany({ where: { parentId: null, isActive: true }, orderBy: { sortOrder: "asc" }, include: { children: true } }),
      [],
    ),
    safeDb(() => prisma.city.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }), []),
    categorySlug ? safeDb(() => prisma.category.findUnique({ where: { slug: categorySlug } }), null) : null,
    citySlug ? safeDb(() => prisma.city.findUnique({ where: { slug: citySlug } }), null) : null,
  ]);

  const [{ items, total }, garageSales] = await Promise.all([
    safeDb(
      () =>
        searchListings({
          q,
          categoryId: category?.id,
          cityId: city?.id,
          minPrice: Number.isFinite(min) ? min : undefined,
          maxPrice: Number.isFinite(max) ? max : undefined,
          condition: condition || undefined,
          listingType: listingType || undefined,
          fulfillment: fulfillment || undefined,
          sort,
          take: 48,
        }),
      { items: [], total: 0 },
    ),
    // Only surface garage sales on the default browse (no type filter that excludes them).
    !listingType
      ? safeDb(() => getActiveCollections(12), [])
      : Promise.resolve([]),
  ]);

  const collectionCards: CollectionCardData[] = garageSales
    .filter((c) => {
      if (city && c.cityId !== city.id) return false;
      if (q) {
        const hay = `${c.title}`.toLowerCase();
        return hay.includes(q.toLowerCase());
      }
      return true;
    })
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      city: c.city,
      itemCount: c.listings.length,
      lowestPriceCents: c.listings.length ? Math.min(...c.listings.map((l) => l.priceCents)) : null,
      imageUrl: c.images[0]?.displayUrl || c.images[0]?.originalUrl || null,
    }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 overflow-hidden rounded-[24px]">
        <SearchHero defaultQuery={q} compact />
      </div>
      <form className="mb-6 grid gap-3 rounded-3xl bg-white p-4 card-shadow md:grid-cols-4">
        <input type="hidden" name="q" defaultValue={q} />
        <select name="category" defaultValue={categorySlug} className="rounded-xl border border-sand-dark bg-sand px-3 py-2.5 text-sm">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="city" defaultValue={citySlug} className="rounded-xl border border-sand-dark bg-sand px-3 py-2.5 text-sm">
          <option value="">All of SLO County</option>
          {cities.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="type" defaultValue={listingType} className="rounded-xl border border-sand-dark bg-sand px-3 py-2.5 text-sm">
          <option value="">All listing types</option>
          <option value="FOR_SALE">For Sale</option>
          <option value="FREE">Free</option>
          <option value="WANTED">Wanted</option>
          <option value="SERVICE">Services</option>
        </select>
        <select name="sort" defaultValue={sort} className="rounded-xl border border-sand-dark bg-sand px-3 py-2.5 text-sm">
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="distance">Distance</option>
          <option value="popular">Most popular</option>
        </select>
        <select name="condition" defaultValue={condition} className="rounded-xl border border-sand-dark bg-sand px-3 py-2.5 text-sm">
          <option value="">Any condition</option>
          <option value="NEW">New</option>
          <option value="LIKE_NEW">Like New</option>
          <option value="GOOD">Good</option>
          <option value="FAIR">Fair</option>
          <option value="USED">Used</option>
        </select>
        <select name="fulfillment" defaultValue={fulfillment} className="rounded-xl border border-sand-dark bg-sand px-3 py-2.5 text-sm">
          <option value="">Pickup or delivery</option>
          <option value="PICKUP_ONLY">Pickup only</option>
          <option value="LOCAL_DELIVERY">Local delivery</option>
        </select>
        <input name="min" type="number" min="0" placeholder="Min $" defaultValue={sp.min ?? ""} className="rounded-xl border border-sand-dark bg-sand px-3 py-2.5 text-sm" />
        <button className="rounded-xl bg-ocean px-3 py-2.5 text-sm font-semibold text-white">Apply filters</button>
      </form>
      <p className="mb-4 text-sm text-muted">
        {total + collectionCards.length} listings across San Luis Obispo County
      </p>
      <ListingGrid listings={items} collections={collectionCards} />
    </div>
  );
}
