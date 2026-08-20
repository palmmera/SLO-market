import { MARKETPLACE_DISCLAIMER } from "@/lib/constants";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-4xl">Terms of use</h1>
      <p className="mt-4 text-sm leading-6 text-muted">
        These terms are a working draft for SLO Market and should be reviewed by qualified counsel before public launch.
      </p>
      <div className="mt-6 space-y-4 text-sm leading-6">
        <p>{MARKETPLACE_DISCLAIMER}</p>
        <p>Basic listings are free. There are no monthly fees for buyers or sellers. Optional Enhanced Description is $1 and is billed separately from marketplace item purchases.</p>
        <p>
          For marketplace transactions, SLO Market collects a 12% platform commission as a Stripe Connect application fee on each completed sale. Checkout uses Stripe Connect direct charges with Stripe-handles-pricing connected accounts: Stripe bills its card-processing fees to the seller’s connected account, and the seller receives the remainder after the platform commission and Stripe’s processing fees. SLO Market does not charge a monthly connected-account fee.
        </p>
        <p>Sellers are responsible for the accuracy of listings, local delivery they offer, and compliance with California and San Luis Obispo County law, including rules for produce and cottage foods.</p>
        <p>Buyers and sellers agree to communicate through SLO Market messaging, meet in public when possible, and not share unnecessary personal information.</p>
      </div>
    </div>
  );
}
