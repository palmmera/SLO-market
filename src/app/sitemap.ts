import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths = ["", "/browse", "/sell", "/sell/food", "/safety", "/terms", "/privacy", "/food-produce-policy", "/local-produce", "/free-stuff", "/rentals"];
  const staticEntries = staticPaths.map((p) => ({
    url: absoluteUrl(p || "/"),
    changeFrequency: "daily" as const,
  }));

  try {
    const [cities, categories, listings] = await Promise.all([
      prisma.city.findMany({ where: { isActive: true } }),
      prisma.category.findMany({ where: { isActive: true } }),
      prisma.listing.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true } }),
    ]);
    return [
      ...staticEntries,
      ...cities.map((c) => ({ url: absoluteUrl(`/${c.slug}`), changeFrequency: "daily" as const })),
      ...categories.map((c) => ({ url: absoluteUrl(`/${c.slug}`), changeFrequency: "daily" as const })),
      ...listings.map((l) => ({ url: absoluteUrl(`/listing/${l.slug}`), lastModified: l.updatedAt })),
    ];
  } catch {
    return staticEntries;
  }
}
