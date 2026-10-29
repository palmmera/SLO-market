import type { CollectionCardData } from "@/components/listing-card";
import { garageSaleIsLive } from "@/lib/garage-live";

type GarageCardRow = {
  id: string;
  slug: string;
  title: string;
  paymentMethod: string;
  liveAt: Date | null;
  city: { name: string };
  images: { displayUrl: string | null; originalUrl: string }[];
  listings: { priceCents: number }[];
};

export function toCollectionCards(rows: GarageCardRow[]): CollectionCardData[] {
  return rows.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    city: c.city,
    itemCount: c.listings.length,
    lowestPriceCents: c.listings.length ? Math.min(...c.listings.map((l) => l.priceCents)) : null,
    imageUrl: c.images[0]?.displayUrl || c.images[0]?.originalUrl || null,
    paymentMethod: c.paymentMethod,
    isLive: garageSaleIsLive(c.liveAt),
  }));
}
