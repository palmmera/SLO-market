import Link from "next/link";
import { ContactForm } from "@/components/contact-form";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal-content";

export const metadata = {
  title: "Contact Us · SLO Market",
  description: "Get in touch with the SLO Market team.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-4xl">Contact Us</h1>
      <p className="mt-4 text-sm leading-6 text-muted">
        Questions about your account, a listing, or the marketplace? Send us a message and we&apos;ll
        follow up by email. For common questions, start with our{" "}
        <Link href="/faq" className="font-semibold text-ocean">
          FAQ
        </Link>
        .
      </p>

      <ContactForm />

      <p className="mt-8 text-sm text-muted">
        You can also email us directly at{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="font-semibold text-ocean">
          {LEGAL_CONTACT_EMAIL}
        </a>
        .
      </p>
    </div>
  );
}
