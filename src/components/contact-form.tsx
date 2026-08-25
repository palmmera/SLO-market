"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { submitContactMessage } from "@/actions/contact";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (sent) {
    return (
      <div className="mt-6 rounded-3xl bg-white p-6 card-shadow">
        <p className="font-display text-xl">Thanks for reaching out</p>
        <p className="mt-2 text-sm text-muted">
          We received your message and will get back to you as soon as we can.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-4 text-sm font-semibold text-ocean"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form
      className="mt-6 space-y-4 rounded-3xl bg-white p-6 card-shadow"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const form = new FormData(e.currentTarget);
        start(async () => {
          const result = await submitContactMessage(form);
          if (result.ok) {
            setSent(true);
          } else {
            setError(result.error);
          }
        });
      }}
    >
      <p className="rounded-2xl bg-sand px-4 py-3 text-sm text-muted">
        Looking for a quick answer? Check our{" "}
        <Link href="/faq" className="font-semibold text-ocean">
          FAQ
        </Link>{" "}
        before submitting — many common questions are covered there.
      </p>

      <input
        name="name"
        required
        placeholder="Your name"
        className="w-full rounded-2xl border border-sand-dark bg-sand px-4 py-3"
      />
      <input
        name="email"
        type="email"
        required
        placeholder="Email"
        className="w-full rounded-2xl border border-sand-dark bg-sand px-4 py-3"
      />
      <input
        name="subject"
        placeholder="Subject (optional)"
        className="w-full rounded-2xl border border-sand-dark bg-sand px-4 py-3"
      />
      <textarea
        name="body"
        required
        rows={6}
        placeholder="How can we help?"
        className="w-full resize-y rounded-2xl border border-sand-dark bg-sand px-4 py-3"
      />
      {error && <p className="text-sm text-clay">{error}</p>}
      <button
        disabled={pending}
        className="w-full rounded-2xl bg-ocean py-3 font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}
