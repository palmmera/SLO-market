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
  if (type === "WANTED") return "Wanted";
  return "For Sale";
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
