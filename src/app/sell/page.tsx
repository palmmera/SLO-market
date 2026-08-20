import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { SellForm } from "@/components/sell-form";
import { redirect } from "next/navigation";

export default async function SellPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login?callbackUrl=/sell");

  const [categories, cities, user] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.city.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.user.findUnique({ where: { id: session.user.id }, include: { stripeAccount: true } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="font-display text-4xl">Sell Something</h1>
      <p className="mt-2 text-muted">Create a free listing in a few minutes. No monthly seller fees—SLO Market takes 12% only when an item sells. Your city is shown publicly, not your address.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Link href="/sell" className="rounded-2xl bg-ocean px-4 py-3 text-center font-semibold text-white">
          List an item
        </Link>
        <Link href="/sell/photo" className="rounded-2xl bg-white px-4 py-3 text-center font-semibold card-shadow">
          Garage sale photo
        </Link>
      </div>
      {user?.stripeAccount?.status !== "PAYOUTS_ENABLED" && (
        <div className="mt-4 rounded-2xl bg-gold/20 p-4 text-sm">
          Connect Stripe to get paid through SLO Market.{" "}
          <Link href="/dashboard/stripe" className="font-semibold text-ocean">
            Get Paid Through SLO Market
          </Link>
        </div>
      )}
      <div className="mt-6">
        <SellForm categories={categories} cities={cities} defaultCityId={user?.cityId || cities[0]?.id} />
      </div>
    </div>
  );
}
