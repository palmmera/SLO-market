import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { absoluteUrl } from "@/lib/utils";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cities, categories, listings] = await Promise.all([
    prisma.city.findMany({ where: { isActive: true } }),
    prisma.category.findMany({ where: { isActive: true } }),
    prisma.listing.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true } }),
  ]);
  const staticPaths = ["", "/browse", "/sell", "/safety", "/terms", "/privacy", "/local-produce", "/free-stuff"];
  return [
    ...staticPaths.map((p) => ({ url: absoluteUrl(p || "/"), changeFrequency: "daily" as const })),
    ...cities.map((c) => ({ url: absoluteUrl(`/${c.slug}`), changeFrequency: "daily" as const })),
    ...categories.map((c) => ({ url: absoluteUrl(`/${c.slug}`), changeFrequency: "daily" as const })),
    ...listings.map((l) => ({ url: absoluteUrl(`/listing/${l.slug}`), lastModified: l.updatedAt })),
  ];
}
