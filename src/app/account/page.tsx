import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney, orderStatusLabel } from "@/lib/utils";

export default async function AccountPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  const [purchases, favorites, reviews] = await Promise.all([
    prisma.order.findMany({
      where: {
        buyerId: session.user.id,
        // Never show abandoned Stripe checkouts — buyer only cares about real purchases.
        status: { notIn: ["PAYMENT_PENDING", "CANCELLED"] },
      },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.favorite.findMany({
      where: { userId: session.user.id },
      include: { listing: { include: { city: true, images: { take: 1 } } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.review.findMany({ where: { reviewerId: session.user.id }, include: { seller: true } }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="font-display text-4xl">Buyer dashboard</h1>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link href="/messages" className="rounded-full bg-white px-4 py-2 card-shadow">Messages</Link>
        <Link href="/favorites" className="rounded-full bg-white px-4 py-2 card-shadow">Favorites</Link>
        <Link href="/profile" className="rounded-full bg-white px-4 py-2 card-shadow">Account settings</Link>
      </div>
      <h2 className="mt-8 font-display text-2xl">Your purchases</h2>
      <div className="mt-3 grid gap-2">
        {purchases.map((o) => (
          <Link key={o.id} href={`/orders/${o.id}`} className="rounded-2xl bg-white p-4 card-shadow">
            {o.items[0]?.title} · {orderStatusLabel(o.status)} · {formatMoney(o.totalCents)}
          </Link>
        ))}
        {purchases.length === 0 && <p className="text-sm text-muted">No purchases yet.</p>}
      </div>
      <h2 className="mt-8 font-display text-2xl">Favorites</h2>
      <p className="text-sm text-muted">{favorites.length} saved</p>
      <h2 className="mt-8 font-display text-2xl">Your reviews</h2>
      {reviews.map((r) => (
        <p key={r.id} className="rounded-2xl bg-white p-4 text-sm card-shadow">
          {r.rating}★ for {r.seller.name}: {r.body}
        </p>
      ))}
    </div>
  );
}
