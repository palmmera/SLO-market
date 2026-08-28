"use client";

import { addCalendarDays, formatMoney, MAX_DAILY_RENTAL_DAYS, rentalDaysInclusive, todayDateInput } from "@/lib/utils";

export function RentalDateRange({
  dailyRateCents,
  startDate,
  endDate,
  onChange,
}: {
  dailyRateCents: number;
  startDate: string;
  endDate: string;
  onChange: (next: { startDate: string; endDate: string }) => void;
}) {
  const min = todayDateInput();
  const maxEnd = addCalendarDays(startDate || min, MAX_DAILY_RENTAL_DAYS - 1);
  const days = startDate && endDate ? rentalDaysInclusive(startDate, endDate) : 0;
  const totalCents = days > 0 ? days * dailyRateCents : 0;

  return (
    <div className="rounded-2xl bg-sand p-4">
      <p className="text-sm font-semibold">Rental dates</p>
      <p className="mt-1 text-xs text-muted">{formatMoney(dailyRateCents)} per day — pick start and end on the calendar.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="text-xs text-muted">
          From
          <input
            type="date"
            min={min}
            value={startDate}
            onChange={(e) => {
              const nextStart = e.target.value;
              onChange({
                startDate: nextStart,
                endDate: endDate && endDate < nextStart ? nextStart : endDate,
              });
            }}
            className="mt-1 w-full rounded-2xl bg-white px-3 py-2.5 text-sm text-ink"
          />
        </label>
        <label className="text-xs text-muted">
          To
          <input
            type="date"
            min={startDate || min}
            max={maxEnd}
            value={endDate}
            onChange={(e) => onChange({ startDate, endDate: e.target.value })}
            className="mt-1 w-full rounded-2xl bg-white px-3 py-2.5 text-sm text-ink"
          />
        </label>
      </div>
      {days > MAX_DAILY_RENTAL_DAYS ? (
        <p className="mt-3 text-sm text-clay">Rentals can be up to {MAX_DAILY_RENTAL_DAYS} days.</p>
      ) : days > 0 ? (
        <p className="mt-3 text-sm">
          {days} day{days === 1 ? "" : "s"} × {formatMoney(dailyRateCents)} ={" "}
          <strong>{formatMoney(totalCents)}</strong>
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted">Choose both dates to see the total.</p>
      )}
    </div>
  );
}
