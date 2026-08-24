import { LegalDocument } from "@/components/legal-document";
import { FOOD_POLICY_SECTIONS, LEGAL_LAST_UPDATED } from "@/lib/legal-content";

export default function FoodProducePolicyPage() {
  return (
    <LegalDocument
      title="Food & Produce Seller Policy"
      lastUpdated={LEGAL_LAST_UPDATED}
      intro="This policy applies to sellers who activate Local Food & Produce Seller status on SLO Market."
      sections={FOOD_POLICY_SECTIONS}
      relatedLinks={[
        { href: "/terms", label: "Terms of Service" },
        { href: "/safety", label: "Community Safety Guidelines" },
        { href: "/dashboard/food-seller", label: "Food seller verification" },
      ]}
    />
  );
}
