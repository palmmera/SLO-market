import { SAFETY_TIPS, MARKETPLACE_DISCLAIMER } from "@/lib/constants";
import { prisma, safeDb } from "@/lib/db";

export default async function SafetyPage() {
  const prohibited = await safeDb(() => prisma.prohibitedItem.findMany({ where: { isActive: true } }), []);
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-4xl">Community safety guidelines</h1>
      <ul className="mt-6 space-y-3">
        {SAFETY_TIPS.map((tip) => (
          <li key={tip} className="rounded-2xl bg-white p-4 card-shadow">
            {tip}
          </li>
        ))}
      </ul>
      <h2 className="mt-8 font-display text-2xl">Prohibited items</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {prohibited.map((p) => (
          <li key={p.id} className="rounded-2xl bg-white p-3 card-shadow">
            <strong>{p.name}.</strong> {p.description}
          </li>
        ))}
      </ul>
      <p className="mt-8 text-sm text-muted">{MARKETPLACE_DISCLAIMER} Legal/terms language should be reviewed by counsel before launch.</p>
    </div>
  );
}
