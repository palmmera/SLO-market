import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/utils";
import {
  adminDeleteUser,
  adminFeatureListing,
  adminRemoveListing,
  adminResolveDispute,
  adminResolveReport,
  adminSaveCategory,
  adminSaveCity,
  adminSaveProhibited,
  adminSuspendUser,
  adminUpdateSettings,
  adminPurgeExpiredImages,
  adminMarkContactRead,
  adminResolveContactMessage,
  adminDeleteContactMessage,
} from "@/actions/admin";
import { OrderStatus } from "@prisma/client";
import Link from "next/link";
import { IMAGE_RETENTION_DAYS } from "@/lib/cleanup-images";

export default async function AdminPage() {
  const session = await getSession();
  if (session?.user?.role !== "ADMIN") redirect("/");

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const week = new Date(Date.now() - 7 * 86400000);

  const [
    users,
    listings,
    orders,
    reports,
    disputes,
    refunds,
    contactMessages,
    categories,
    cities,
    prohibited,
    settings,
    stats,
  ] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { city: true } }),
    prisma.listing.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { seller: true, city: true } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { buyer: true, seller: true } }),
    prisma.report.findMany({ where: { status: "OPEN" }, orderBy: { createdAt: "desc" }, include: { reporter: true, listing: true } }),
    prisma.dispute.findMany({ where: { status: "OPEN" }, include: { order: true } }),
    prisma.refund.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { order: true } }),
    prisma.contactMessage.findMany({
      where: { status: { in: ["OPEN", "READ"] } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.city.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.prohibitedItem.findMany({ orderBy: { name: "asc" } }),
    prisma.platformSettings.findUnique({ where: { id: "default" } }),
    Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { lastActiveAt: { gte: week } } }),
      prisma.user.count({ where: { createdAt: { gte: since } } }),
      prisma.listing.count(),
      prisma.listing.count({ where: { createdAt: { gte: since } } }),
      prisma.order.count({ where: { status: { in: [OrderStatus.PAID, OrderStatus.COMPLETED, OrderStatus.SELLER_CONFIRMED] } } }),
      prisma.order.aggregate({
        where: { status: { notIn: [OrderStatus.PAYMENT_PENDING, OrderStatus.CANCELLED] } },
        _sum: { totalCents: true, platformFeeCents: true, itemPriceCents: true },
      }),
      prisma.enhancedDescriptionPurchase.aggregate({ where: { status: "PAID" }, _sum: { amountCents: true } }),
      prisma.listing.count({ where: { status: "SOLD" } }),
      prisma.listing.count({ where: { listingType: "FREE" } }),
      prisma.order.count({ where: { fulfillment: "PICKUP_ONLY", status: { not: OrderStatus.PAYMENT_PENDING } } }),
      prisma.order.count({ where: { fulfillment: "LOCAL_DELIVERY", status: { not: OrderStatus.PAYMENT_PENDING } } }),
    ]),
  ]);

  const [
    totalUsers,
    activeUsers,
    newUsers,
    totalListings,
    listingsToday,
    totalTx,
    money,
    enhanced,
    sold,
    free,
    pickup,
    delivery,
  ] = stats;

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-8">
      <h1 className="font-display text-4xl">Admin</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="Total users" value={totalUsers} />
        <Card label="Active users" value={activeUsers} />
        <Card label="New users" value={newUsers} />
        <Card label="Total listings" value={totalListings} />
        <Card label="Listings today" value={listingsToday} />
        <Card label="Transactions" value={totalTx} />
        <Card label="Volume" value={formatMoney(money._sum.totalCents ?? 0)} />
        <Card label="Commission revenue" value={formatMoney(money._sum.platformFeeCents ?? 0)} />
        <Card label="Enhanced-description revenue" value={formatMoney(enhanced._sum.amountCents ?? 0)} />
        <Card label="Sold listings" value={sold} />
        <Card label="Free listings" value={free} />
        <Card label="Pickup tx" value={pickup} />
        <Card label="Delivery tx" value={delivery} />
      </div>

      <section>
        <h2 className="font-display text-2xl">Platform settings</h2>
        <form action={adminUpdateSettings} className="mt-3 grid gap-2 rounded-3xl bg-white p-4 card-shadow md:grid-cols-2">
          <label className="text-sm">
            Commission %
            <input name="commissionPercent" defaultValue={Number(settings?.commissionPercent ?? 12)} className="mt-1 w-full rounded-xl bg-sand px-3 py-2" />
          </label>
          <label className="text-sm">
            Enhanced description cents
            <input name="enhancedDescriptionCents" defaultValue={settings?.enhancedDescriptionCents ?? 100} className="mt-1 w-full rounded-xl bg-sand px-3 py-2" />
          </label>
          <label className="text-sm">
            Stripe fee treatment
            <select name="stripeFeeTreatment" defaultValue={settings?.stripeFeeTreatment} className="mt-1 w-full rounded-xl bg-sand px-3 py-2">
              <option value="CONNECT_DEFAULT">Stripe handles pricing (recommended — seller pays Stripe card fees; no $2/MAA)</option>
              <option value="DEDUCT_FROM_SELLER">Same as above (seller pays Stripe card fees via Connect)</option>
              <option value="ABSORB_BY_PLATFORM">Not available with Stripe-handles-pricing direct charges</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="commissionOnDelivery" defaultChecked={settings?.commissionOnDelivery} />
            Commission on delivery fees
          </label>
          <button className="rounded-xl bg-ocean py-2 text-white md:col-span-2">Save settings</button>
        </form>
      </section>

      <section>
        <h2 className="font-display text-2xl">Photo storage</h2>
        <p className="mt-1 text-sm text-muted">
          Sold or removed listings keep their photos for {IMAGE_RETENTION_DAYS} days (disputes / history), then photos are deleted and only text remains. This also runs automatically about once a day.
        </p>
        <form action={adminPurgeExpiredImages} className="mt-3">
          <button className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white">
            Run {IMAGE_RETENTION_DAYS}-day photo cleanup now
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-display text-2xl">Users</h2>
        <div className="mt-3 overflow-x-auto rounded-3xl bg-white card-shadow">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3">Name</th>
                <th>Email</th>
                <th>City</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-sand">
                  <td className="p-3">{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.city?.name}</td>
                  <td className="p-3">
                    <form action={adminSuspendUser.bind(null, u.id, "Suspended by admin")}>
                      <button className="text-clay">Suspend</button>
                    </form>
                    <form action={adminDeleteUser.bind(null, u.id)}>
                      <button className="text-xs text-muted">Delete</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl">Listings</h2>
        <div className="mt-3 grid gap-2">
          {listings.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-3 card-shadow">
              <Link href={`/listing/${l.slug}`} className="font-medium">
                {l.title} · {l.city.name} · {l.status}
              </Link>
              <div className="flex gap-2 text-sm">
                <form action={adminFeatureListing.bind(null, l.id, !l.isFeatured)}>
                  <button>{l.isFeatured ? "Unfeature" : "Feature"}</button>
                </form>
                <form action={adminRemoveListing.bind(null, l.id)}>
                  <button className="text-clay">Remove</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl">Transactions / commissions / refunds</h2>
        <div className="mt-3 grid gap-2">
          {orders.map((o) => (
            <Link key={o.id} href={`/orders/${o.id}`} className="rounded-2xl bg-white p-3 text-sm card-shadow">
              {o.orderNumber} · {o.status} · {formatMoney(o.totalCents)} · fee {formatMoney(o.platformFeeCents)}
            </Link>
          ))}
          {refunds.map((r) => (
            <div key={r.id} className="rounded-2xl bg-white p-3 text-sm card-shadow">
              Refund {formatMoney(r.amountCents)} · {r.order.orderNumber}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl">Contact messages</h2>
        <p className="mt-1 text-sm text-muted">Messages submitted from the Contact Us page.</p>
        {contactMessages.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No open messages.</p>
        ) : (
          contactMessages.map((m) => (
            <div key={m.id} className="mt-3 rounded-2xl bg-white p-4 text-sm card-shadow">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <span className="font-semibold">{m.name}</span>
                  <span className="text-muted"> · </span>
                  <a href={`mailto:${m.email}`} className="text-ocean">
                    {m.email}
                  </a>
                </div>
                <span className="text-xs text-muted">
                  {m.status === "OPEN" ? "New" : "Read"} · {m.createdAt.toLocaleString()}
                </span>
              </div>
              {m.subject && <p className="mt-1 font-medium">{m.subject}</p>}
              <p className="mt-2 whitespace-pre-wrap text-muted">{m.body}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {m.status === "OPEN" && (
                  <form action={adminMarkContactRead.bind(null, m.id)}>
                    <button className="text-ocean">Mark read</button>
                  </form>
                )}
                <form action={adminResolveContactMessage.bind(null, m.id)}>
                  <button className="text-ocean">Resolve</button>
                </form>
                <form action={adminDeleteContactMessage.bind(null, m.id)}>
                  <button className="text-clay">Delete</button>
                </form>
              </div>
            </div>
          ))
        )}
      </section>

      <section>
        <h2 className="font-display text-2xl">Reports</h2>
        {reports.map((r) => (
          <form key={r.id} action={adminResolveReport.bind(null, r.id)} className="mt-2 rounded-2xl bg-white p-3 text-sm card-shadow">
            {r.reason} · {r.targetType} · {r.details}
            <button className="ml-3 text-ocean">Resolve</button>
          </form>
        ))}
      </section>

      <section>
        <h2 className="font-display text-2xl">Disputes</h2>
        {disputes.map((d) => (
          <form
            key={d.id}
            action={async (formData) => {
              "use server";
              await adminResolveDispute(d.id, String(formData.get("notes") || ""));
            }}
            className="mt-2 rounded-2xl bg-white p-3 text-sm card-shadow"
          >
            <Link href={`/orders/${d.orderId}`}>{d.order.orderNumber}</Link> · {d.reason}
            <p>{d.details}</p>
            <input name="notes" placeholder="Admin notes" className="mt-2 w-full rounded-xl bg-sand px-3 py-2" />
            <button className="mt-2 text-ocean">Resolve</button>
          </form>
        ))}
      </section>

      <section>
        <h2 className="font-display text-2xl">Categories</h2>
        <form action={adminSaveCategory} className="mt-3 grid gap-2 rounded-3xl bg-white p-4 card-shadow md:grid-cols-3">
          <input name="name" placeholder="Name" className="rounded-xl bg-sand px-3 py-2" />
          <input name="slug" placeholder="slug" className="rounded-xl bg-sand px-3 py-2" />
          <button className="rounded-xl bg-ocean text-white">Add category</button>
        </form>
        <div className="mt-2 text-sm">
          {categories.map((c) => (
            <div key={c.id}>{c.name}</div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl">Cities</h2>
        <form action={adminSaveCity} className="mt-3 grid gap-2 rounded-3xl bg-white p-4 card-shadow md:grid-cols-3">
          <input name="name" placeholder="City name" className="rounded-xl bg-sand px-3 py-2" />
          <input name="slug" placeholder="slug" className="rounded-xl bg-sand px-3 py-2" />
          <button className="rounded-xl bg-ocean text-white">Add city</button>
        </form>
        <div className="mt-2 text-sm">{cities.map((c) => c.name).join(" · ")}</div>
      </section>

      <section>
        <h2 className="font-display text-2xl">Prohibited items</h2>
        <form action={adminSaveProhibited} className="mt-3 grid gap-2 rounded-3xl bg-white p-4 card-shadow">
          <input name="name" placeholder="Name" className="rounded-xl bg-sand px-3 py-2" />
          <input name="description" placeholder="Description" className="rounded-xl bg-sand px-3 py-2" />
          <button className="rounded-xl bg-ocean py-2 text-white">Add</button>
        </form>
        <ul className="mt-3 list-disc pl-5 text-sm">
          {prohibited.map((p) => (
            <li key={p.id}>
              {p.name}: {p.description}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white p-3 card-shadow">
      <div className="text-xs text-muted">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
