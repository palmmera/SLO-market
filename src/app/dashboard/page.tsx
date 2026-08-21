import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney, stripeStatusLabel } from "@/lib/utils";
import { ListingStatus } from "@prisma/client";
import { ActiveListingRow } from "@/components/active-listing-row";

export default async function SellerDashboard() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const [active, drafts, sold, pending, completed, stripe, sales, enhanced] = await Promise.all([
    prisma.listing.findMany({
      where: { sellerId: userId, status: ListingStatus.ACTIVE },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.listing.findMany({
      where: { sellerId: userId, status: ListingStatus.DRAFT },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.listing.findMany({ where: { sellerId: userId, status: ListingStatus.SOLD }, take: 20, orderBy: { soldAt: "desc" } }),
    prisma.order.findMany({ where: { sellerId: userId, status: { in: ["PAID", "SELLER_CONFIRMED", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY"] } }, include: { items: true } }),
    prisma.order.findMany({ where: { sellerId: userId, status: "COMPLETED" }, take: 20 }),
    prisma.stripeAccount.findUnique({ where: { userId } }),
    prisma.order.aggregate({
      where: { sellerId: userId, status: { in: ["PAID", "SELLER_CONFIRMED", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "COMPLETED"] } },
      _sum: { itemPriceCents: true, platformFeeCents: true, sellerPayoutCents: true },
    }),
    prisma.enhancedDescriptionPurchase.count({ where: { userId, status: "PAID" } }),
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
      <Section title="Pending Orders">
        {pending.length === 0 && <Empty />}
        {pending.map((o) => (
          <Link key={o.id} href={`/orders/${o.id}`} className="block rounded-2xl bg-white p-4 card-shadow">
            {o.orderNumber} · {o.items[0]?.title}
          </Link>
        ))}
      </Section>
      {drafts.length > 0 && (
        <Section title="Drafts">
          <div className="grid gap-2">
            {drafts.map((l) => {
              const image = l.images[0]?.thumbnailUrl || l.images[0]?.url;
              return (
                <Link
                  key={l.id}
                  href={`/dashboard/listings/${l.id}/edit`}
                  className="flex items-center gap-3 rounded-2xl bg-white p-3 card-shadow"
                >
                  <div className="shrink-0 overflow-hidden rounded-xl bg-sand-dark">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt="" className="h-16 w-16 object-cover" />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center text-[10px] text-muted">No photo</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{l.title}</div>
                    <p className="mt-0.5 text-xs text-muted">Draft — continue to publish</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </Section>
      )}
      <Section title="Active Listings">
        {active.length === 0 && <Empty />}
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
                images: l.images,
              }}
            />
          ))}
        </div>
      </Section>
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
