import { LegalDocument } from "@/components/legal-document";
import { LEGAL_LAST_UPDATED, PRIVACY_SECTIONS } from "@/lib/legal-content";

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      lastUpdated={LEGAL_LAST_UPDATED}
      intro="This Privacy Policy describes how SLO Market collects, uses, and protects your information."
      sections={PRIVACY_SECTIONS}
      relatedLinks={[
        { href: "/terms", label: "Terms of Service" },
        { href: "/safety", label: "Community Safety Guidelines" },
      ]}
    />
  );
}
