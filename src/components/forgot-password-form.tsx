"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { requestPasswordReset } from "@/actions/auth";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  if (sent) {
    return (
      <div className="mt-6 rounded-3xl bg-white p-6 card-shadow">
        <p className="text-sm">
          If an account exists for that email, we&apos;ve sent a password reset link. Check your inbox (and spam
          folder) — the link expires in 1 hour.
        </p>
        <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-ocean">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form
      className="mt-6 space-y-4 rounded-3xl bg-white p-6 card-shadow"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        start(async () => {
          await requestPasswordReset(form);
          setSent(true);
        });
      }}
    >
      <input
        name="email"
        type="email"
        required
        placeholder="Email"
        className="w-full rounded-2xl border border-sand-dark bg-sand px-4 py-3"
      />
      <button disabled={pending} className="w-full rounded-2xl bg-ocean py-3 font-semibold text-white disabled:opacity-60">
        {pending ? "Sending..." : "Send reset link"}
      </button>
      <Link href="/login" className="block text-center text-sm text-muted">
        Back to sign in
      </Link>
    </form>
  );
}
