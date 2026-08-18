import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CheckoutForm } from "@/components/checkout-form";
import { getPlatformSettings, stripeFeeCopy } from "@/lib/fees";
import { ListingStatus } from "@prisma/client";

export default async function CheckoutPage({ params }: { params: Promise<{ listingId: string }> }) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  const listing = await prisma.listing.findUnique({
    where: { id: (await params).listingId },
    include: { seller: { include: { stripeAccount: true } } },
  });
  if (!listing || listing.status !== ListingStatus.ACTIVE) notFound();
  const settings = await getPlatformSettings();

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <CheckoutForm
        listingId={listing.id}
        title={listing.title}
        sellerName={listing.seller.name}
        itemPriceCents={listing.priceCents}
        canDeliver={listing.fulfillment === "LOCAL_DELIVERY"}
        freeDelivery={listing.freeDelivery}
        deliveryFeeCents={listing.deliveryFeeCents}
        deliveryRadius={listing.deliveryRadiusMiles}
        payoutsEnabled={listing.seller.stripeAccount?.status === "PAYOUTS_ENABLED"}
      />
      <p className="mt-4 text-xs text-muted">
        SLO Market collects a 12% platform commission on the item price through Stripe Connect. Delivery fees are {settings.commissionOnDelivery ? "included in" : "not included in"} the commission base. {stripeFeeCopy(settings.stripeFeeTreatment)} Card numbers never touch SLO Market servers.
      </p>
    </div>
  );
}
