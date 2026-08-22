"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { resetPassword } from "@/actions/auth";

export function ResetPasswordForm({ token }: { token: string }) {
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <div className="mt-6 rounded-3xl bg-white p-6 card-shadow">
        <p className="text-sm">Your password has been updated. You can now sign in with your new password.</p>
        <Link href="/login" className="mt-4 inline-block rounded-2xl bg-ocean px-5 py-2.5 text-sm font-semibold text-white">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form
      className="mt-6 space-y-4 rounded-3xl bg-white p-6 card-shadow"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        const form = new FormData(e.currentTarget);
        const password = String(form.get("password") || "");
        const confirm = String(form.get("confirm") || "");
        if (password.length < 8) {
          setError("Password must be at least 8 characters.");
          return;
        }
        if (password !== confirm) {
          setError("Passwords do not match.");
          return;
        }
        form.set("token", token);
        start(async () => {
          const result = await resetPassword(form);
          if (result.ok) {
            setDone(true);
          } else {
            setError(result.error);
          }
        });
      }}
    >
      <input
        name="password"
        type="password"
        required
        placeholder="New password (8+ characters)"
        className="w-full rounded-2xl border border-sand-dark bg-sand px-4 py-3"
      />
      <input
        name="confirm"
        type="password"
        required
        placeholder="Confirm new password"
        className="w-full rounded-2xl border border-sand-dark bg-sand px-4 py-3"
      />
      {error && <p className="text-sm text-clay">{error}</p>}
      <button disabled={pending} className="w-full rounded-2xl bg-ocean py-3 font-semibold text-white disabled:opacity-60">
        {pending ? "Updating..." : "Update password"}
      </button>
    </form>
  );
}
