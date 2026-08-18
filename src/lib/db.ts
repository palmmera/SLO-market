import { PrismaClient } from "@prisma/client";

function databaseUrl() {
  const url = process.env.DATABASE_URL || "";
  if (!url) return url;
  if (url.startsWith("file:")) return url;
  if (url.includes("sslmode=")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}sslmode=require`;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: databaseUrl() ? { db: { url: databaseUrl() } } : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
