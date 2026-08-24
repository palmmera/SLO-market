import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FoodSellerActivationForm } from "@/components/food-seller-activation-form";
import { FoodSellerBadge } from "@/components/food-seller-badge";

export default async function FoodSellerDashboardPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/food-seller");

  const [cities, user, profile] = await Promise.all([
    prisma.city.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.foodSellerProfile.findUnique({ where: { userId: session.user.id } }),
  ]);
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/dashboard" className="text-sm font-semibold text-ocean">
        ← Seller dashboard
      </Link>
      <h1 className="mt-3 font-display text-4xl">Local Food &amp; Produce Seller</h1>
      <p className="mt-2 text-muted">
        Complete this verification once to list food and produce — including photo stands where buyers tap items on your stand photo.
      </p>
      {profile?.status === "ACTIVE" && (
        <div className="mt-4 rounded-2xl bg-ocean-light p-4">
          <FoodSellerBadge className="text-sm" />
          <p className="mt-2 text-sm text-ocean-dark">You&apos;re verified. List individual items or create a produce stand photo.</p>
          <Link href="/sell/food" className="mt-3 inline-flex rounded-full bg-ocean px-4 py-2 text-sm font-semibold text-white">
            Sell food &amp; produce
          </Link>
        </div>
      )}
      <div className="mt-6">
        <FoodSellerActivationForm
          cities={cities}
          defaultName={profile?.fullName || user.name}
          defaultEmail={profile?.email || user.email}
          defaultPhone={profile?.phone || ""}
          defaultCityId={profile?.cityId || user.cityId || cities[0]?.id}
          existing={profile}
        />
      </div>
    </div>
  );
}
