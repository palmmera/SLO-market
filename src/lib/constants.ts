export const BRAND = {
  name: "SLO MARKET",
  short: "SLO Market",
  tagline: "Buy Local. Sell Local. Keep It in SLO.",
  altTagline: "San Luis Obispo's Local Marketplace",
  county: "San Luis Obispo County",
};

export const SAFETY_TIPS = [
  "Meet in a safe/public location when possible.",
  "Never share unnecessary personal information.",
  "Inspect items before completing a transaction.",
  "Only use the marketplace payment system for transactions that require online payment.",
];

export const MARKETPLACE_DISCLAIMER =
  "SLO Market is a marketplace platform connecting independent buyers and sellers. SLO Market does not itself own, inspect, guarantee, or sell the listed products.";

export const SUGGESTED_FIRST_MESSAGE = "Hi, is this still available?";

export const DELIVERY_RADIUS_OPTIONS = [
  { label: "5 miles", value: 5 },
  { label: "10 miles", value: 10 },
  { label: "15 miles", value: 15 },
  { label: "25 miles", value: 25 },
];

export const CONDITIONS = [
  { value: "NEW", label: "New" },
  { value: "LIKE_NEW", label: "Like New" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
  { value: "USED", label: "Used" },
] as const;

export const HOTSPOT_CONDITIONS = [
  { value: "NEW", label: "New" },
  { value: "LIKE_NEW", label: "Like New" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
  { value: "FOR_PARTS", label: "For Parts" },
] as const;

export const RESERVED_PATHS = new Set([
  "browse",
  "sell",
  "messages",
  "favorites",
  "profile",
  "login",
  "register",
  "listing",
  "listings",
  "collection",
  "checkout",
  "orders",
  "dashboard",
  "account",
  "admin",
  "api",
  "safety",
  "terms",
  "privacy",
  "notifications",
  "search",
  "uploads",
  "users",
  "u",
  "c",
  "pay",
  "success",
  "wanted",
]);
