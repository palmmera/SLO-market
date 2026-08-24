import { LegalDocument } from "@/components/legal-document";
import { LEGAL_LAST_UPDATED, TERMS_SECTIONS } from "@/lib/legal-content";

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      lastUpdated={LEGAL_LAST_UPDATED}
      intro="These Terms govern your use of SLO Market. Please read them carefully."
      sections={TERMS_SECTIONS}
      relatedLinks={[
        { href: "/privacy", label: "Privacy Policy" },
        { href: "/safety", label: "Community Safety Guidelines" },
        { href: "/food-produce-policy", label: "Food & Produce Seller Policy" },
      ]}
    />
  );
}
