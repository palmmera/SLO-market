import slugify from "slugify";
import { nanoid } from "nanoid";
import { prisma } from "./db";

export function makeSlug(input: string) {
  const base = slugify(input, { lower: true, strict: true }).slice(0, 70);
  return `${base}-${nanoid(6).toLowerCase()}`;
}

export async function uniqueListingSlug(title: string, cityName: string) {
  const base = slugify(`${title} ${cityName}`, { lower: true, strict: true }).slice(0, 80);
  let slug = base;
  let i = 1;
  while (await prisma.listing.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

export async function uniqueCollectionSlug(title: string, cityName: string) {
  const base = slugify(`${title} ${cityName}`, { lower: true, strict: true }).slice(0, 80);
  let slug = base;
  let i = 1;
  while (await prisma.collection.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

export function orderNumber() {
  return `SLO-${Date.now().toString(36).toUpperCase()}-${nanoid(4).toUpperCase()}`;
}
