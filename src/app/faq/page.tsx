import Link from "next/link";
import { FAQ_ITEMS } from "@/lib/faq-content";

export const metadata = {
  title: "FAQ · SLO Market",
  description: "Frequently asked questions about buying and selling on SLO Market.",
};

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-4xl">Frequently Asked Questions</h1>
      <p className="mt-4 text-sm leading-6 text-muted">
        Quick answers about buying, selling, and staying safe on SLO Market. Still stuck?{" "}
        <Link href="/contact" className="font-semibold text-ocean">
          Contact us
        </Link>
        .
      </p>

      <ul className="mt-8 space-y-4">
        {FAQ_ITEMS.map((item) => (
          <li key={item.question} className="rounded-3xl bg-white p-5 card-shadow">
            <h2 className="font-display text-xl">{item.question}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{item.answer}</p>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-sm text-muted">
        Also see our{" "}
        <Link href="/safety" className="font-semibold text-ocean">
          Safety Guidelines
        </Link>
        ,{" "}
        <Link href="/terms" className="font-semibold text-ocean">
          Terms
        </Link>
        , and{" "}
        <Link href="/food-produce-policy" className="font-semibold text-ocean">
          Food Policy
        </Link>
        .
      </p>
    </div>
  );
}
