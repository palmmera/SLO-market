import type { NextConfig } from "next";

if (process.env.NEXT_PHASE === "phase-production-build" && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://build:build@127.0.0.1:5432/build";
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
  serverExternalPackages: ["@prisma/client", "sharp"],
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
