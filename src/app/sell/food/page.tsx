import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SellForm } from "@/components/sell-form";
import { FoodSellerBadge } from "@/components/food-seller-badge";

export default async function SellFoodPage({
  searchParams,
}: {
  searchParams: Promise<{ activated?: string }>;
}) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login?callbackUrl=/sell/food");

  const sp = await searchParams;
  const [categories, cities, user, profile, produceParent] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.city.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.user.findUnique({ where: { id: session.user.id }, include: { stripeAccount: true } }),
    prisma.foodSellerProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.category.findFirst({ where: { slug: "local-produce" } }),
  ]);

  const foodSellerActive = profile?.status === "ACTIVE";
  const stripeReady =
    user?.stripeAccount?.status === "PAYOUTS_ENABLED" && Boolean(user.stripeAccount.payoutsEnabled);

  if (!foodSellerActive) {
    return (
      <div className="mx-auto max-w-xl px-4 py-6">
        <h1 className="font-display text-4xl">Local Food &amp; Produce</h1>
        <p className="mt-2 text-muted">
          Before you list food or produce, complete a one-time seller verification. You won&apos;t need to repeat it for each listing.
        </p>
        <Link href="/dashboard/food-seller" className="mt-6 inline-flex rounded-2xl bg-clay px-6 py-3 font-semibold text-white">
          Activate Food &amp; Produce Seller
        </Link>
        <Link href="/sell" className="mt-4 block text-sm font-semibold text-ocean">
          ← Back to sell something else
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/sell" className="text-sm font-semibold text-ocean">
        ← All selling options
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-4xl">Local Food &amp; Produce</h1>
        <FoodSellerBadge />
      </div>
      {sp.activated === "1" && (
        <p className="mt-3 rounded-2xl bg-ocean-light p-4 text-sm text-ocean-dark">
          You&apos;re set up as a Local Food Seller. Choose how you want to list below.
        </p>
      )}
      <p className="mt-2 text-muted">
        List a single item, or upload a photo of your stand and let buyers tap what they want — same easy flow as a garage sale photo.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <a href="#food-listing-form" className="rounded-2xl bg-ocean px-4 py-3 text-center font-semibold text-white hover:bg-ocean-dark transition-colors">
          List one item
        </a>
        <Link href="/sell/food/photo" className="rounded-2xl bg-white px-4 py-3 text-center font-semibold card-shadow hover:bg-sand transition-colors">
          Produce stand photo
        </Link>
      </div>
      {!stripeReady && (
        <div className="mt-4 rounded-2xl bg-gold/20 p-4 text-sm">
          Connect Stripe when you publish so buyers can pay you.{" "}
          <Link href="/dashboard/stripe" className="font-semibold text-ocean">
            Manage Stripe
          </Link>
        </div>
      )}
      <div id="food-listing-form" className="mt-6">
        <SellForm
          categories={categories}
          cities={cities}
          defaultCityId={user?.cityId || cities[0]?.id}
          stripeReady={stripeReady}
          produceMode
          defaultParentId={produceParent?.id}
          foodSellerActive
        />
      </div>
    </div>
  );
}
