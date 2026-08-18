"use client";

import { useTransition } from "react";
import { leaveReview, openDispute, updateOrderStatus, refundOrder, cancelOrder } from "@/actions/orders";
import { OrderStatus } from "@prisma/client";

export function OrderControls({
  orderId,
  status,
  isSeller,
  isBuyer,
  isAdmin,
}: {
  orderId: string;
  status: OrderStatus;
  isSeller: boolean;
  isBuyer: boolean;
  isAdmin: boolean;
}) {
  const [pending, start] = useTransition();

  return (
    <div className="space-y-3">
      {isSeller && status === "PAID" && (
        <button className="w-full rounded-2xl bg-ocean py-3 text-white" disabled={pending} onClick={() => start(() => updateOrderStatus(orderId, "SELLER_CONFIRMED"))}>
          Confirm order
        </button>
      )}
      {isSeller && status === "SELLER_CONFIRMED" && (
        <button className="w-full rounded-2xl bg-ocean py-3 text-white" disabled={pending} onClick={() => start(() => updateOrderStatus(orderId, "READY_FOR_PICKUP"))}>
          Mark ready for pickup
        </button>
      )}
      {isSeller && (status === "READY_FOR_PICKUP" || status === "SELLER_CONFIRMED") && (
        <button className="w-full rounded-2xl bg-ocean py-3 text-white" disabled={pending} onClick={() => start(() => updateOrderStatus(orderId, "OUT_FOR_DELIVERY"))}>
          Out for delivery
        </button>
      )}
      {isBuyer && ["PAID", "SELLER_CONFIRMED", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY"].includes(status) && (
        <button className="w-full rounded-2xl bg-ink py-3 text-white" disabled={pending} onClick={() => start(() => updateOrderStatus(orderId, "COMPLETED"))}>
          Confirm completion
        </button>
      )}
      {isBuyer && status === "COMPLETED" && (
        <form
          className="rounded-2xl bg-sand p-3"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            start(() => leaveReview(orderId, Number(form.get("rating")), String(form.get("body") || "")));
          }}
        >
          <p className="mb-2 text-sm font-semibold">Rate this seller</p>
          <select name="rating" className="w-full rounded-xl bg-white px-3 py-2">
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} stars
              </option>
            ))}
          </select>
          <textarea name="body" placeholder="Optional review" className="mt-2 w-full rounded-xl bg-white px-3 py-2" />
          <button className="mt-2 w-full rounded-xl bg-ocean py-2 text-white">Submit review</button>
        </form>
      )}
      {isBuyer && !["COMPLETED", "REFUNDED", "CANCELLED"].includes(status) && (
        <form
          className="rounded-2xl bg-sand p-3"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            start(() => openDispute(orderId, String(form.get("reason")), String(form.get("details"))));
          }}
        >
          <p className="text-sm font-semibold">Report a problem</p>
          <select name="reason" className="mt-2 w-full rounded-xl bg-white px-3 py-2 text-sm">
            <option>Item not as described</option>
            <option>Item damaged</option>
            <option>Seller didn&apos;t provide item</option>
            <option>Buyer didn&apos;t receive item</option>
            <option>Delivery problem</option>
            <option>Seller cancelled</option>
            <option>Other</option>
          </select>
          <textarea name="details" required className="mt-2 w-full rounded-xl bg-white px-3 py-2 text-sm" />
          <button className="mt-2 w-full rounded-xl bg-clay py-2 text-sm text-white">Open dispute</button>
        </form>
      )}
      {(isSeller || isAdmin) && ["PAID", "SELLER_CONFIRMED", "DISPUTED"].includes(status) && (
        <button className="w-full rounded-2xl bg-sand py-3 text-sm" onClick={() => start(() => refundOrder(orderId, "Seller or admin refund"))}>
          Refund through Stripe
        </button>
      )}
      {["PAYMENT_PENDING", "PAID"].includes(status) && (
        <button className="w-full text-sm text-muted" onClick={() => start(() => cancelOrder(orderId, "Cancelled by user"))}>
          Cancel order
        </button>
      )}
    </div>
  );
}
