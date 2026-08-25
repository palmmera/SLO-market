"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Heart, Home, Menu, MessageCircle, Plus, Search, UserRound } from "lucide-react";
import { useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/browse", label: "Browse" },
  { href: "/messages", label: "Messages" },
  { href: "/favorites", label: "Favorites" },
  { href: "/profile", label: "Profile" },
];

export function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-sand-dark/80 bg-sand/90 backdrop-blur">
      <div className="bg-clay px-4 py-2.5 text-center text-sm font-medium leading-snug text-white">
        Website under construction — you can still create an account, browse, and explore. Features and content may change.
      </div>
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href="/" className="shrink-0">
          <div className="font-display text-xl font-semibold tracking-tight text-ocean-dark">SLO MARKET</div>
          <div className="hidden text-[10px] uppercase tracking-[0.18em] text-muted sm:block">San Luis Obispo County</div>
        </Link>

        <form action="/browse" className="hidden flex-1 md:block">
          <label className="sr-only" htmlFor="header-search">
            Search
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              id="header-search"
              name="q"
              placeholder="What are you looking for?"
              className="w-full rounded-full border border-sand-dark bg-white py-2.5 pl-10 pr-4 text-sm outline-none ring-ocean/30 placeholder:text-muted focus:ring-2"
            />
          </div>
        </form>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-3 py-1.5 text-sm ${pathname === link.href ? "bg-ocean text-white" : "text-ink/80 hover:bg-white"}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/sell"
          className="ml-auto inline-flex items-center gap-1 rounded-full bg-clay px-3 py-2 text-sm font-semibold text-white shadow-sm md:ml-0"
        >
          <Plus className="h-4 w-4" />
          Sell Something
        </Link>

        <Link href={session ? "/profile" : "/login"} className="hidden rounded-full bg-white p-2 md:inline-flex">
          <UserRound className="h-5 w-5" />
        </Link>
        <button type="button" className="rounded-full bg-white p-2 lg:hidden" onClick={() => setOpen((v) => !v)} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <div className="border-t border-sand-dark bg-sand px-4 py-3 lg:hidden">
          <div className="grid grid-cols-2 gap-2">
            {links.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-xl bg-white px-3 py-2 text-sm">
                {link.label}
              </Link>
            ))}
            {session?.user?.role === "ADMIN" && (
              <Link href="/admin" onClick={() => setOpen(false)} className="rounded-xl bg-white px-3 py-2 text-sm">
                Admin
              </Link>
            )}
            <Link href="/safety" onClick={() => setOpen(false)} className="rounded-xl bg-white px-3 py-2 text-sm">
              Safety
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "Home", icon: Home },
    { href: "/browse", label: "Browse", icon: Search },
    { href: "/sell", label: "Sell", icon: Plus, primary: true },
    { href: "/messages", label: "Messages", icon: MessageCircle },
    { href: "/profile", label: "Profile", icon: UserRound },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-sand-dark bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-2 text-[11px] ${item.primary ? "-mt-3" : ""} ${active ? "text-ocean" : "text-muted"}`}
            >
              <span
                className={
                  item.primary
                    ? "flex h-12 w-12 items-center justify-center rounded-full bg-clay text-white shadow-lg"
                    : "flex h-6 w-6 items-center justify-center"
                }
              >
                <Icon className={item.primary ? "h-6 w-6" : "h-5 w-5"} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="hidden border-t border-sand-dark bg-ocean-dark text-white md:block">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <div className="font-display text-2xl">SLO MARKET</div>
          <p className="mt-2 text-sm text-white/80">Buy Local. Sell Local. Keep It in SLO.</p>
          <p className="mt-3 text-xs text-white/60">San Luis Obispo&apos;s Local Marketplace</p>
        </div>
        <div>
          <div className="text-sm font-semibold">Explore</div>
          <div className="mt-3 grid gap-2 text-sm text-white/80">
            <Link href="/browse">Browse listings</Link>
            <Link href="/local-produce">Local Produce</Link>
            <Link href="/free-stuff">Free Stuff</Link>
            <Link href="/sell">Sell Something</Link>
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold">Community</div>
          <div className="mt-3 grid gap-2 text-sm text-white/80">
            <Link href="/faq">FAQ</Link>
            <Link href="/contact">Contact Us</Link>
            <Link href="/safety">Safety Guidelines</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/food-produce-policy">Food Policy</Link>
            <Link href="/san-luis-obispo">San Luis Obispo</Link>
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold">Keep it local</div>
          <p className="mt-3 text-sm text-white/80">
            SLO Market connects independent buyers and sellers across San Luis Obispo County. We don&apos;t own or inspect listed items.
          </p>
        </div>
      </div>
    </footer>
  );
}

export function HeartIcon(props: { className?: string }) {
  return <Heart {...props} />;
}
