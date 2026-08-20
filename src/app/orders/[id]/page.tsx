import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney, orderStatusLabel } from "@/lib/utils";
import { OrderControls } from "@/components/order-controls";
import { getPlatformSettings, stripeFeeCopy } from "@/lib/fees";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  const order = await prisma.order.findUnique({
    where: { id: (await params).id },
    include: {
      buyer: true,
      seller: true,
      items: { include: { listing: { include: { images: { take: 1 } } } } },
      review: true,
      disputes: true,
      refunds: true,
    },
  });
  if (!order) notFound();
  if (order.buyerId !== session.user.id && order.sellerId !== session.user.id && session.user.role !== "ADMIN") {
    redirect("/");
  }
  const settings = await getPlatformSettings();
  const sp = await searchParams;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      {sp.paid === "1" && <p className="mb-4 rounded-2xl bg-ocean-light p-3 text-sm">Payment confirmation received. Order status updates when Stripe confirms the webhook.</p>}
      <p className="text-xs uppercase tracking-[0.2em] text-ocean">{order.orderNumber}</p>
      <h1 className="font-display text-3xl">{orderStatusLabel(order.status)}</h1>
      <div className="mt-4 space-y-3 rounded-3xl bg-white p-5 card-shadow">
        {order.items.map((item) => (
          <Link key={item.id} href={`/listing/${item.listing.slug}`} className="block font-semibold">
            {item.title}
          </Link>
        ))}
        <div className="text-sm">
          <div>Item: {formatMoney(order.itemPriceCents)}</div>
          <div>Delivery: {order.deliveryFeeCents ? formatMoney(order.deliveryFeeCents) : "None"}</div>
          <div>Total paid: {formatMoney(order.totalCents)}</div>
          <div>SLO Market commission: {formatMoney(order.platformFeeCents)}</div>
          <div>Seller proceeds (before Stripe card fees): {formatMoney(order.sellerPayoutCents)}</div>
        </div>
        <p className="text-xs text-muted">{stripeFeeCopy(settings.stripeFeeTreatment)}</p>
      </div>
      <div className="mt-4">
        <OrderControls
          orderId={order.id}
          status={order.status}
          isSeller={order.sellerId === session.user.id}
          isBuyer={order.buyerId === session.user.id}
          isAdmin={session.user.role === "ADMIN"}
        />
      </div>
      <Link href="/messages" className="mt-4 block text-center text-sm font-semibold text-ocean">
        Message about this order
      </Link>
    </div>
  );
}
