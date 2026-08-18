import { prisma } from "@/lib/db";
import { ListingStatus } from "@prisma/client";

const listingInclude = {
  city: true,
  images: { orderBy: { sortOrder: "asc" as const }, take: 1 },
};

export async function getActiveListings(where: Record<string, unknown> = {}, take = 8) {
  return prisma.listing.findMany({
    where: { status: ListingStatus.ACTIVE, ...where },
    include: listingInclude,
    orderBy: { publishedAt: "desc" },
    take,
  });
}

export async function searchListings(params: {
  q?: string;
  categoryId?: string;
  cityId?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  listingType?: string;
  fulfillment?: string;
  sort?: string;
  take?: number;
  skip?: number;
}) {
  const where: Record<string, unknown> = { status: ListingStatus.ACTIVE };
  if (params.q) {
    where.OR = [
      { title: { contains: params.q, mode: "insensitive" } },
      { description: { contains: params.q, mode: "insensitive" } },
    ];
  }
  if (params.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: params.categoryId },
      include: { children: true },
    });
    const ids = category ? [category.id, ...category.children.map((c) => c.id)] : [params.categoryId];
    where.categoryId = { in: ids };
  }
  const distanceSort = params.sort === "distance";
  const originCity = params.cityId && distanceSort
    ? await prisma.city.findUnique({ where: { id: params.cityId } })
    : null;
  if (params.cityId && !distanceSort) where.cityId = params.cityId;
  if (params.condition) where.condition = params.condition;
  if (params.listingType) where.listingType = params.listingType;
  if (params.fulfillment) where.fulfillment = params.fulfillment;
  if (params.minPrice != null || params.maxPrice != null) {
    where.priceCents = {
      ...(params.minPrice != null ? { gte: params.minPrice } : {}),
      ...(params.maxPrice != null ? { lte: params.maxPrice } : {}),
    };
  }

  const orderBy =
    params.sort === "price_asc"
      ? { priceCents: "asc" as const }
      : params.sort === "price_desc"
        ? { priceCents: "desc" as const }
        : params.sort === "popular"
          ? { favoriteCount: "desc" as const }
          : { publishedAt: "desc" as const };

  const [rawItems, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      include: listingInclude,
      orderBy: distanceSort ? { publishedAt: "desc" } : orderBy,
      take: distanceSort ? 200 : params.take ?? 24,
      skip: distanceSort ? 0 : params.skip ?? 0,
    }),
    prisma.listing.count({ where }),
  ]);

  const items = originCity?.latitude && originCity.longitude
    ? [...rawItems]
        .sort((a, b) => milesBetween(originCity.latitude!, originCity.longitude!, a.city.latitude, a.city.longitude) - milesBetween(originCity.latitude!, originCity.longitude!, b.city.latitude, b.city.longitude))
        .slice(params.skip ?? 0, (params.skip ?? 0) + (params.take ?? 24))
    : rawItems;

  return { items, total };
}

function milesBetween(lat1: number, lon1: number, lat2?: number | null, lon2?: number | null) {
  if (lat2 == null || lon2 == null) return 9999;
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
