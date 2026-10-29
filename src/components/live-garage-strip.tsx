"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getFrontPageLiveGarageSales } from "@/actions/live-feed";
import { ListingGrid, type CollectionCardData } from "@/components/listing-card";

export function LiveGarageStrip({ initial }: { initial: CollectionCardData[] }) {
  const [sales, setSales] = useState(initial);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      getFrontPageLiveGarageSales()
        .then((next) => {
          if (!cancelled) setSales(next);
        })
        .catch(() => {});
    };
    const id = window.setInterval(tick, 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (!sales.length) return null;

  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <h2 className="flex items-center gap-2 font-display text-2xl md:text-3xl">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#e11d48] opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-[#e11d48]" />
          </span>
          Live now
        </h2>
        <Link href="/garage-sale" className="text-sm font-medium text-ocean">
          See all
        </Link>
      </div>
      <p className="mb-4 text-sm text-muted">A seller is at their garage sale right now. Open it to message them about an item.</p>
      <ListingGrid listings={[]} collections={sales} />
    </section>
  );
}
