import Link from "next/link";
import { prisma, safeDb } from "@/lib/db";
import { LEGAL_LAST_UPDATED, SAFETY_GUIDELINES } from "@/lib/legal-content";
import { MARKETPLACE_DISCLAIMER } from "@/lib/constants";

export default async function SafetyPage() {
  const prohibited = await safeDb(() => prisma.prohibitedItem.findMany({ where: { isActive: true } }), []);
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-4xl">Community Safety Guidelines</h1>
      <p className="mt-2 text-sm text-muted">Last updated: {LEGAL_LAST_UPDATED}</p>
      <p className="mt-4 text-sm leading-6 text-muted">
        These guidelines help keep SLO Market safe for buyers and sellers in San Luis Obispo County. They supplement our{" "}
        <Link href="/terms" className="font-semibold text-ocean">
          Terms of Service
        </Link>
        .
      </p>

      <h2 className="mt-8 font-display text-2xl">Safety tips</h2>
      <ul className="mt-4 space-y-3">
        {SAFETY_GUIDELINES.map((tip) => (
          <li key={tip} className="rounded-2xl bg-white p-4 text-sm card-shadow">
            {tip}
          </li>
        ))}
      </ul>

      <h2 className="mt-8 font-display text-2xl">Prohibited items</h2>
      <p className="mt-2 text-sm text-muted">Do not list the following on SLO Market:</p>
      <ul className="mt-3 space-y-2 text-sm">
        {prohibited.map((p) => (
          <li key={p.id} className="rounded-2xl bg-white p-3 card-shadow">
            <strong>{p.name}.</strong> {p.description}
          </li>
        ))}
      </ul>

      <h2 className="mt-8 font-display text-2xl">Reporting</h2>
      <p className="mt-2 text-sm leading-6">
        Use report buttons on listings, reviews, or user profiles if you see scams, prohibited items, harassment, or other
        violations. We may remove content, suspend accounts, or take other action at our discretion.
      </p>

      <h2 className="mt-8 font-display text-2xl">Food and produce</h2>
      <p className="mt-2 text-sm leading-6">
        Food and produce sellers must follow our{" "}
        <Link href="/food-produce-policy" className="font-semibold text-ocean">
          Food & Produce Seller Policy
        </Link>
        . SLO Market does not inspect or certify food products.
      </p>

      <p className="mt-8 text-sm text-muted">{MARKETPLACE_DISCLAIMER}</p>
    </div>
  );
}
