"use client";

import {
  addCalendarDays,
  formatDateLabel,
  formatMoney,
  MAX_DAILY_RENTAL_DAYS,
  nextAvailableStart,
  overlappingBookedRange,
  rentalDaysInclusive,
  todayDateInput,
  type RentalDateRangeValue,
} from "@/lib/utils";

export function RentalDateRange({
  dailyRateCents,
  startDate,
  endDate,
  onChange,
  bookedRanges = [],
}: {
  dailyRateCents: number;
  startDate: string;
  endDate: string;
  onChange: (next: { startDate: string; endDate: string }) => void;
  bookedRanges?: RentalDateRangeValue[];
}) {
  const today = todayDateInput();
  const min = nextAvailableStart(today, bookedRanges);
  const maxEnd = addCalendarDays(startDate || min, MAX_DAILY_RENTAL_DAYS - 1);
  const days = startDate && endDate ? rentalDaysInclusive(startDate, endDate) : 0;
  const totalCents = days > 0 ? days * dailyRateCents : 0;
  const overlap = overlappingBookedRange(startDate, endDate, bookedRanges);
  const current = bookedRanges.find((b) => today >= b.startDate && today <= b.endDate);

  return (
    <div className="rounded-2xl bg-sand p-4">
      <p className="text-sm font-semibold">Rental dates</p>
      <p className="mt-1 text-xs text-muted">{formatMoney(dailyRateCents)} per day — pick pickup and return dates.</p>
      {current && (
        <p className="mt-2 rounded-xl bg-white px-3 py-2 text-sm">
          Currently rented through {formatDateLabel(current.endDate)}. Next available{" "}
          <strong>{formatDateLabel(min)}</strong>.
        </p>
      )}
      {bookedRanges.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs text-muted">
          {bookedRanges.map((range) => (
            <li key={`${range.startDate}-${range.endDate}`}>
              Unavailable {formatDateLabel(range.startDate)} – {formatDateLabel(range.endDate)}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="text-xs text-muted">
          Pickup
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
          Return
          <input
            type="date"
            min={startDate && startDate > min ? startDate : min}
            max={maxEnd}
            value={endDate}
            onChange={(e) => onChange({ startDate, endDate: e.target.value })}
            className="mt-1 w-full rounded-2xl bg-white px-3 py-2.5 text-sm text-ink"
          />
        </label>
      </div>
      {overlap ? (
        <p className="mt-3 text-sm text-clay">
          Those dates overlap a booking ({formatDateLabel(overlap.startDate)} – {formatDateLabel(overlap.endDate)}).
          Wait until that rental ends, or pick dates after it.
        </p>
      ) : days > MAX_DAILY_RENTAL_DAYS ? (
        <p className="mt-3 text-sm text-clay">Rentals can be up to {MAX_DAILY_RENTAL_DAYS} days.</p>
      ) : days > 0 ? (
        <p className="mt-3 text-sm">
          {days} day{days === 1 ? "" : "s"} × {formatMoney(dailyRateCents)} ={" "}
          <strong>{formatMoney(totalCents)}</strong>
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted">Choose pickup and return dates to see the total.</p>
      )}
    </div>
  );
}
