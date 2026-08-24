import Link from "next/link";
import type { LegalSection } from "@/lib/legal-content";

export function LegalDocument({
  title,
  lastUpdated,
  intro,
  sections,
  relatedLinks,
}: {
  title: string;
  lastUpdated: string;
  intro?: string;
  sections: LegalSection[];
  relatedLinks?: { href: string; label: string }[];
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-muted">Last updated: {lastUpdated}</p>
      {intro && <p className="mt-4 text-sm leading-6 text-muted">{intro}</p>}
      <div className="mt-8 space-y-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="font-display text-xl">{section.title}</h2>
            <div className="mt-3 space-y-3 text-sm leading-6">
              {section.paragraphs.map((p) => (
                <p key={p.slice(0, 40)}>{p}</p>
              ))}
              {section.bullets && (
                <ul className="list-disc space-y-2 pl-5">
                  {section.bullets.map((b) => (
                    <li key={b.slice(0, 40)}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ))}
      </div>
      {relatedLinks && relatedLinks.length > 0 && (
        <div className="mt-10 rounded-2xl bg-sand p-4 text-sm">
          <p className="font-semibold">Related policies</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {relatedLinks.map((link) => (
              <Link key={link.href} href={link.href} className="font-semibold text-ocean">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
