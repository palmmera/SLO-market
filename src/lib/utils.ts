import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatCityCounty(cityName?: string | null) {
  if (!cityName) return "San Luis Obispo County";
  if (cityName === "Other SLO County") return "SLO County";
  return cityName;
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function absoluteUrl(path = "") {
  const base = process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export function listingTypeLabel(type: string) {
  if (type === "FREE") return "FREE";
  if (type === "RENTAL") return "Rental";
  if (type === "SERVICE") return "Service";
  if (type === "WANTED") return "Wanted";
  return "For Sale";
}

export function isPayableListingType(type: string) {
  return type === "FOR_SALE" || type === "RENTAL";
}

export const HOUSING_RENTAL_SLUGS = ["rental-rooms", "rental-houses"] as const;

export function isHousingRentalSlug(slug?: string | null) {
  return slug === "rental-rooms" || slug === "rental-houses";
}

export const DAILY_RENTAL_SLUGS = [
  "rental-power-tools",
  "rental-equipment",
  "rental-trailers",
  "rental-cars",
  "rental-party",
  "rental-outdoor",
] as const;

export const MAX_DAILY_RENTAL_DAYS = 90;

export function isDailyRentalSlug(slug?: string | null) {
  return Boolean(slug && (DAILY_RENTAL_SLUGS as readonly string[]).includes(slug));
}

/** Every rental (tools, trailers, cars, party, outdoor, rooms, houses) is priced per day. */
export function isDailyRentalListing(listingType?: string | null, _categorySlug?: string | null) {
  return listingType === "RENTAL";
}

/** Inclusive calendar days. Jan 1–Jan 5 = 5 days. Same-day start and end = 1 day. */
export function rentalDaysInclusive(startDate: string, endDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return 0;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

export function addCalendarDays(isoDate: string, days: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function toNoonUtc(isoDate: string) {
  return new Date(`${isoDate}T12:00:00.000Z`);
}

export function dateToInput(value: Date | null | undefined) {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

export function validateRentalPeriod(startDate: string, endDate: string) {
  const days = rentalDaysInclusive(startDate, endDate);
  if (days < 1) return { ok: false as const, error: "Choose a start and end date on the calendar." };
  if (days > MAX_DAILY_RENTAL_DAYS) {
    return { ok: false as const, error: `Rentals can be up to ${MAX_DAILY_RENTAL_DAYS} days.` };
  }
  const utcToday = new Date().toISOString().slice(0, 10);
  const minStart = addCalendarDays(utcToday, -1);
  if (startDate < minStart) return { ok: false as const, error: "Start date cannot be in the past." };
  return { ok: true as const, days };
}

export type RentalDateRangeValue = { startDate: string; endDate: string };

export function rangesOverlap(a: RentalDateRangeValue, b: RentalDateRangeValue) {
  return a.startDate <= b.endDate && b.startDate <= a.endDate;
}

export function mergeRentalRanges(ranges: RentalDateRangeValue[]) {
  const sorted = [...ranges].filter((r) => r.startDate && r.endDate).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const out: RentalDateRangeValue[] = [];
  for (const range of sorted) {
    const last = out[out.length - 1];
    if (last && addCalendarDays(last.endDate, 1) >= range.startDate) {
      if (range.endDate > last.endDate) last.endDate = range.endDate;
    } else {
      out.push({ startDate: range.startDate, endDate: range.endDate });
    }
  }
  return out;
}

/** If today (or a candidate start) falls inside booked days, jump to the day after that booking. */
export function nextAvailableStart(fromDate: string, booked: RentalDateRangeValue[]) {
  let candidate = fromDate;
  for (let i = 0; i < 40; i++) {
    const hit = booked.find((b) => candidate >= b.startDate && candidate <= b.endDate);
    if (!hit) return candidate;
    candidate = addCalendarDays(hit.endDate, 1);
  }
  return candidate;
}

export function overlappingBookedRange(startDate: string, endDate: string, booked: RentalDateRangeValue[]) {
  if (!startDate || !endDate) return null;
  return booked.find((b) => rangesOverlap({ startDate, endDate }, b)) ?? null;
}

export function todayDateInput() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function formatDateLabel(isoDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function conditionLabel(condition?: string | null) {
  const map: Record<string, string> = {
    NEW: "New",
    LIKE_NEW: "Like New",
    GOOD: "Good",
    FAIR: "Fair",
    USED: "Used",
    FOR_PARTS: "For Parts",
  };
  return condition ? map[condition] ?? condition : "";
}

export function stripeStatusLabel(status?: string | null) {
  const map: Record<string, string> = {
    NOT_CONNECTED: "Not Connected",
    SETUP_INCOMPLETE: "Setup Incomplete",
    CONNECTED: "Connected",
    PAYOUTS_ENABLED: "Payouts Enabled",
  };
  return status ? map[status] ?? status : "Not Connected";
}

export function orderStatusLabel(status: string) {
  const map: Record<string, string> = {
    PAYMENT_PENDING: "Payment Pending",
    PAID: "Paid",
    SELLER_CONFIRMED: "Seller Confirmed",
    READY_FOR_PICKUP: "Ready for Pickup",
    OUT_FOR_DELIVERY: "Out for Delivery",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    REFUNDED: "Refunded",
    DISPUTED: "Disputed",
  };
  return map[status] ?? status;
}
