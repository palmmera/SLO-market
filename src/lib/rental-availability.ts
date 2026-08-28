import { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  dateToInput,
  formatDateLabel,
  mergeRentalRanges,
  nextAvailableStart,
  overlappingBookedRange,
  todayDateInput,
  toNoonUtc,
  type RentalDateRangeValue,
} from "@/lib/utils";

const BLOCKING_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.SELLER_CONFIRMED,
  OrderStatus.READY_FOR_PICKUP,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.COMPLETED,
  OrderStatus.DISPUTED,
];

const PENDING_HOLD_MS = 2 * 60 * 60 * 1000;

export async function getBookedRentalRanges(listingId: string, opts?: { excludeOrderId?: string }) {
  const today = todayDateInput();
  const holdAfter = new Date(Date.now() - PENDING_HOLD_MS);
  const orders = await prisma.order.findMany({
    where: {
      items: { some: { listingId } },
      rentalStartDate: { not: null },
      rentalEndDate: { gte: toNoonUtc(today) },
      ...(opts?.excludeOrderId ? { id: { not: opts.excludeOrderId } } : {}),
      OR: [
        { status: { in: BLOCKING_STATUSES } },
        { status: OrderStatus.PAYMENT_PENDING, createdAt: { gte: holdAfter } },
      ],
    },
    select: { rentalStartDate: true, rentalEndDate: true },
  });

  return mergeRentalRanges(
    orders
      .map((order) => ({
        startDate: dateToInput(order.rentalStartDate),
        endDate: dateToInput(order.rentalEndDate),
      }))
      .filter((range) => range.startDate && range.endDate),
  );
}

export function rentalAvailability(booked: RentalDateRangeValue[]) {
  const today = todayDateInput();
  const nextStart = nextAvailableStart(today, booked);
  const current = booked.find((b) => today >= b.startDate && today <= b.endDate) ?? null;
  return { today, nextStart, current, booked };
}

export function assertRentalDatesFree(startDate: string, endDate: string, booked: RentalDateRangeValue[]) {
  const overlap = overlappingBookedRange(startDate, endDate, booked);
  if (!overlap) return;
  throw new Error(
    `Those dates are already booked (${formatDateLabel(overlap.startDate)} to ${formatDateLabel(overlap.endDate)}). Pick dates after the current rental ends.`,
  );
}
