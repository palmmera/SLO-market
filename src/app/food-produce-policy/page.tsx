import Link from "next/link";
import { MARKETPLACE_DISCLAIMER } from "@/lib/constants";

export default function FoodProducePolicyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-4xl">Food &amp; Produce Seller Policy</h1>
      <p className="mt-4 text-sm leading-6 text-muted">
        This policy applies to sellers who activate Local Food &amp; Produce Seller status on SLO Marketplace.
      </p>
      <div className="mt-6 space-y-4 text-sm leading-6">
        <p>{MARKETPLACE_DISCLAIMER}</p>
        <p>
          SLO Marketplace does not grow, manufacture, prepare, inspect, test, certify, or guarantee food or produce sold by users. Sellers are solely responsible for the legality, safety, quality, labeling, and compliance of their products.
        </p>
        <p>
          Sellers must comply with all applicable California and San Luis Obispo County laws, including agricultural sales rules and California Cottage Food Operations requirements. San Luis Obispo County Environmental Health handles food registration and permitting. Class A registration generally covers direct sales to consumers; Class B permits cover direct and indirect sales.
        </p>
        <p>
          SLO Marketplace collects seller attestation and permit information when applicable. We do not verify permits with the County. Providing false or misleading information may result in removal of listings and suspension or termination of your seller account.
        </p>
        <p>
          Fresh produce listings should accurately describe what is offered. Packaged or preserved foods (honey, jam, pickled goods, and similar) may require registration or permit information at listing time when applicable.
        </p>
        <p>
          See also our{" "}
          <Link href="/terms" className="font-semibold text-ocean">
            Terms of use
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
