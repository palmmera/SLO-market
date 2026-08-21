import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StripeConnectPanel } from "@/components/stripe-panel";
import { refreshStripeStatus } from "@/actions/orders";
import { stripeConfigured } from "@/lib/stripe";

export default async function StripePage() {
  try {
    const session = await getSession();
    if (!session?.user?.id) redirect("/login");
    
    
    let refreshError: string | null = null;
    try {
      await refreshStripeStatus();
    } catch (err) {
      refreshError = err instanceof Error ? err.message : "Failed to refresh Stripe status";
      console.error("Stripe refresh error:", err);
    }
    
    const account = await prisma.stripeAccount.findUnique({ where: { userId: session.user.id } });
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        {refreshError && (
          <div className="mb-4 rounded-2xl bg-clay/10 p-4 text-sm text-clay">
            <strong>Warning:</strong> {refreshError}
          </div>
        )}
        <StripeConnectPanel
          status={account?.status || "NOT_CONNECTED"}
          detailsSubmitted={Boolean(account?.detailsSubmitted)}
          chargesEnabled={Boolean(account?.chargesEnabled)}
          payoutsEnabled={Boolean(account?.payoutsEnabled)}
          stripeConfigured={stripeConfigured()}
        />
      </div>
    );
  } catch (error) {
    console.error("[Stripe Page] Critical error:", error);
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="rounded-2xl bg-clay/10 p-6 text-clay">
          <h1 className="font-display text-2xl mb-2">Stripe Configuration Error</h1>
          <p className="text-sm mb-4">
            {error instanceof Error ? error.message : "An error occurred loading Stripe settings"}
          </p>
          <p className="text-xs">
            This may be due to an outdated Stripe account configuration. 
            Please contact support or try refreshing the page.
          </p>
        </div>
      </div>
    );
  }
}
