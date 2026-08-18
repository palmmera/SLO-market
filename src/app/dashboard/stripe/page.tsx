import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StripeConnectPanel } from "@/components/stripe-panel";
import { refreshStripeStatus } from "@/actions/orders";

export default async function StripePage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  await refreshStripeStatus().catch(() => null);
  const account = await prisma.stripeAccount.findUnique({ where: { userId: session.user.id } });
  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <StripeConnectPanel
        status={account?.status || "NOT_CONNECTED"}
        detailsSubmitted={Boolean(account?.detailsSubmitted)}
        chargesEnabled={Boolean(account?.chargesEnabled)}
        payoutsEnabled={Boolean(account?.payoutsEnabled)}
      />
    </div>
  );
}
