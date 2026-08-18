import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { Providers } from "@/components/providers";
import { Header, Footer, BottomNav } from "@/components/header";
import { BRAND } from "@/lib/constants";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} · ${BRAND.altTagline}`,
    template: `%s · ${BRAND.name}`,
  },
  description: `${BRAND.tagline} Buy and sell locally across San Luis Obispo County. Free listings, secure payments, and a marketplace built for neighbors.`,
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: BRAND.name,
  },
};

export const viewport: Viewport = {
  themeColor: "#0b6e6a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${fraunces.variable} font-sans antialiased`}>
        <Providers>
          <Header />
          <main className="safe-bottom min-h-[70vh]">{children}</main>
          <Footer />
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
