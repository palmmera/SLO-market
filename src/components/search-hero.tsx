"use client";

import Link from "next/link";
import { Search } from "lucide-react";

export function SearchHero({ defaultQuery = "", compact = false }: { defaultQuery?: string; compact?: boolean }) {
  return (
    <section className={compact ? "" : "rounded-[28px] bg-ocean px-5 py-8 text-white shadow-xl md:px-10 md:py-12"}>
      {!compact && (
        <>
          <p className="text-xs uppercase tracking-[0.25em] text-white/70">San Luis Obispo County</p>
          <h1 className="mt-2 font-display text-4xl leading-tight md:text-6xl">Buy Local. Sell Local. Keep It in SLO.</h1>
          <p className="mt-3 max-w-xl text-white/85">San Luis Obispo&apos;s local marketplace — free listings, neighbor-to-neighbor, built for the Central Coast.</p>
        </>
      )}
      <form action="/browse" className={`grid gap-3 ${compact ? "" : "mt-6"} md:grid-cols-[1fr_220px_auto]`}>
        <label className="relative">
          <span className="mb-1 block text-xs font-medium text-white/80">{compact ? "" : "What are you looking for?"}</span>
          <Search className={`pointer-events-none absolute ${compact ? "top-1/2 left-3 -translate-y-1/2" : "bottom-3.5 left-3"} h-4 w-4 text-muted`} />
          <input
            name="q"
            defaultValue={defaultQuery}
            placeholder="Dining table, bike, avocados..."
            className="w-full rounded-2xl border-0 bg-white py-3.5 pl-10 pr-4 text-ink outline-none"
          />
        </label>
        <label>
          {!compact && <span className="mb-1 block text-xs font-medium text-white/80">Location</span>}
          <input
            readOnly
            value="San Luis Obispo County"
            className="w-full rounded-2xl border-0 bg-white/95 py-3.5 px-4 text-ink"
          />
        </label>
        <button className={`rounded-2xl bg-gold px-6 py-3.5 font-semibold text-ink ${compact ? "" : "md:mt-5"}`}>
          Search
        </button>
      </form>
      {!compact && (
        <div className="mt-5">
          <Link href="/sell" className="inline-flex rounded-full bg-clay px-5 py-3 font-semibold text-white">
            Sell Something
          </Link>
        </div>
      )}
    </section>
  );
}
