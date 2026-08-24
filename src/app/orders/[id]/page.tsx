import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney, orderStatusLabel } from "@/lib/utils";
import { OrderControls } from "@/components/order-controls";
import { getPlatformSettings, stripeFeeCopy } from "@/lib/fees";
import { confirmOrderPayment } from "@/actions/orders";
import { OrderStatus } from "@prisma/client";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const sp = await searchParams;

  let order = await prisma.order.findUnique({
    where: { id },
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

  // Buyer returned from Stripe Checkout — confirm payment even if the Connect webhook lagged.
  if (sp.paid === "1" && order.status === OrderStatus.PAYMENT_PENDING) {
    await confirmOrderPayment(order.id);
    order = await prisma.order.findUnique({
      where: { id },
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
  }

  const isBuyer = order.buyerId === session.user.id;
  const isSeller = order.sellerId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  const showSellerFinancials = isSeller || isAdmin;
  const settings = await getPlatformSettings();
  const justPaid = sp.paid === "1" && order.status !== OrderStatus.PAYMENT_PENDING;
  const stillPending = order.status === OrderStatus.PAYMENT_PENDING;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      {justPaid && (
        <p className="mb-4 rounded-2xl bg-ocean-light p-3 text-sm text-ocean-dark">
          Payment received. The seller has been notified — arrange pickup or delivery in Messages.
        </p>
      )}
      {sp.paid === "1" && stillPending && (
        <p className="mb-4 rounded-2xl bg-gold/20 p-3 text-sm">
          We’re confirming your payment with Stripe. Refresh this page in a moment if the status doesn’t update.
        </p>
      )}
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
          <div className="font-semibold">Total {isBuyer ? "paid" : ""}: {formatMoney(order.totalCents)}</div>
          {showSellerFinancials && (
            <>
              <div className="mt-2 border-t border-sand-dark pt-2 text-muted">
                SLO Market commission: {formatMoney(order.platformFeeCents)}
              </div>
              <div className="text-muted">Your proceeds (before Stripe card fees): {formatMoney(order.sellerPayoutCents)}</div>
              <p className="mt-2 text-xs text-muted">{stripeFeeCopy(settings.stripeFeeTreatment)}</p>
            </>
          )}
        </div>
      </div>
      <div className="mt-4">
        <OrderControls
          orderId={order.id}
          status={order.status}
          isSeller={isSeller}
          isBuyer={isBuyer}
          isAdmin={isAdmin}
        />
      </div>
      <Link href="/messages" className="mt-4 block text-center text-sm font-semibold text-ocean">
        Message about this order
      </Link>
    </div>
  );
}
