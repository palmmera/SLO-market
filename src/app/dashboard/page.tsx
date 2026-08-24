import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney, stripeStatusLabel } from "@/lib/utils";
import { ListingStatus } from "@prisma/client";
import { ActiveListingRow } from "@/components/active-listing-row";
import { DraftListingRow } from "@/components/draft-listing-row";
import { ExpiredListingRow } from "@/components/expired-listing-row";
import { GarageSaleRow } from "@/components/garage-sale-row";

export default async function SellerDashboard() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const [active, drafts, expired, sold, pending, completed, stripe, sales, enhanced, garageSales] =
    await Promise.all([
      prisma.listing.findMany({
        where: { sellerId: userId, status: ListingStatus.ACTIVE, collectionId: null },
        include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.listing.findMany({
        where: { sellerId: userId, status: ListingStatus.DRAFT, collectionId: null },
        include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.listing.findMany({
        where: { sellerId: userId, status: ListingStatus.EXPIRED, collectionId: null },
        include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.listing.findMany({
        where: { sellerId: userId, status: ListingStatus.SOLD, collectionId: null },
        take: 20,
        orderBy: { soldAt: "desc" },
      }),
      prisma.order.findMany({
        where: {
          sellerId: userId,
          status: { in: ["PAID", "SELLER_CONFIRMED", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY"] },
        },
        include: { items: true },
      }),
      prisma.order.findMany({ where: { sellerId: userId, status: "COMPLETED" }, take: 20 }),
      prisma.stripeAccount.findUnique({ where: { userId } }),
      prisma.order.aggregate({
        where: {
          sellerId: userId,
          status: { in: ["PAID", "SELLER_CONFIRMED", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "COMPLETED"] },
        },
        _sum: { itemPriceCents: true, platformFeeCents: true, sellerPayoutCents: true },
      }),
      prisma.enhancedDescriptionPurchase.count({ where: { userId, status: "PAID" } }),
      prisma.collection.findMany({
        where: {
          sellerId: userId,
          status: { in: [ListingStatus.ACTIVE, ListingStatus.DRAFT] },
        },
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          listings: {
            where: { status: { in: [ListingStatus.ACTIVE, ListingStatus.DRAFT] } },
            select: { id: true, categoryId: true },
            take: 1,
            orderBy: { createdAt: "asc" },
          },
          _count: {
            select: {
              listings: { where: { status: { in: [ListingStatus.ACTIVE, ListingStatus.DRAFT] } } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

  const totalSales = sales._sum.itemPriceCents ?? 0;
  const fees = sales._sum.platformFeeCents ?? 0;
  const proceeds = sales._sum.sellerPayoutCents ?? 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="font-display text-4xl">Seller dashboard</h1>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Total Sales" value={formatMoney(totalSales)} />
        <Stat label="SLO Market Fees" value={formatMoney(fees)} />
        <Stat label="Seller Proceeds" value={formatMoney(proceeds)} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Stat label="Stripe Connect Status" value={stripeStatusLabel(stripe?.status)} />
        <Stat label="Enhanced Description Purchases" value={String(enhanced)} />
      </div>
      <Link href="/dashboard/stripe" className="mt-4 inline-flex rounded-full bg-ocean px-4 py-2 text-sm font-semibold text-white">
        Manage Stripe Account
      </Link>
      <Link href="/dashboard/food-seller" className="ml-2 mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold card-shadow">
        Local Food Seller
      </Link>
      <Section title="Pending Orders">
        {pending.length === 0 && <Empty />}
        {pending.map((o) => (
          <Link key={o.id} href={`/orders/${o.id}`} className="block rounded-2xl bg-white p-4 card-shadow">
            {o.orderNumber} · {o.items[0]?.title}
          </Link>
        ))}
      </Section>
      {garageSales.length > 0 && (
        <Section title="Photo sales (garage &amp; produce stands)">
          <div className="grid gap-2">
            {garageSales.map((sale) => (
              <GarageSaleRow
                key={sale.id}
                sale={{
                  id: sale.id,
                  slug: sale.slug,
                  title: sale.title,
                  itemCount: sale._count.listings,
                  imageId: sale.images[0]?.id ?? null,
                  imageUrl: sale.images[0]?.displayUrl || sale.images[0]?.originalUrl || null,
                  categoryId: sale.listings[0]?.categoryId ?? null,
                  collectionType: sale.type,
                }}
              />
            ))}
          </div>
        </Section>
      )}
      {drafts.length > 0 && (
        <Section title="Drafts — finish Stripe to publish">
          <div className="grid gap-2">
            {drafts.map((l) => (
              <DraftListingRow key={l.id} listing={{ id: l.id, title: l.title, images: l.images }} />
            ))}
          </div>
        </Section>
      )}
      <Section title="Active Listings">
        {active.length === 0 && garageSales.length === 0 && <Empty />}
        <div className="grid gap-2">
          {active.map((l) => (
            <ActiveListingRow
              key={l.id}
              listing={{
                id: l.id,
                slug: l.slug,
                title: l.title,
                priceCents: l.priceCents,
                listingType: l.listingType,
                expiresAt: l.expiresAt ? l.expiresAt.toISOString() : null,
                images: l.images,
              }}
            />
          ))}
        </div>
      </Section>
      {expired.length > 0 && (
        <Section title="Expired Listings">
          <div className="grid gap-2">
            {expired.map((l) => (
              <ExpiredListingRow
                key={l.id}
                listing={{
                  id: l.id,
                  slug: l.slug,
                  title: l.title,
                  priceCents: l.priceCents,
                  listingType: l.listingType,
                  images: l.images,
                }}
              />
            ))}
          </div>
        </Section>
      )}
      <Section title="Sold Listings">
        {sold.length === 0 && <Empty />}
        {sold.map((l) => (
          <div key={l.id} className="rounded-2xl bg-white p-4 card-shadow">
            {l.title}
          </div>
        ))}
      </Section>
      <Section title="Completed Orders">
        {completed.map((o) => (
          <Link key={o.id} href={`/orders/${o.id}`} className="block rounded-2xl bg-white p-4 card-shadow">
            {o.orderNumber}
          </Link>
        ))}
      </Section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white p-4 card-shadow">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-2xl">{title}</h2>
      <div className="grid gap-2">{children}</div>
    </section>
  );
}
function Empty() {
  return <p className="text-sm text-muted">Nothing here yet.</p>;
}
