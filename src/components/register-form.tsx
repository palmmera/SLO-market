"use client";

import { GoogleAuthButton } from "@/components/google-auth-button";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { FormEvent, useState } from "react";

export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/register", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error || "Could not create account.");
      return;
    }
    await signIn("credentials", {
      email: String(form.get("email")),
      password: String(form.get("password")),
      callbackUrl: "/",
    });
  }

  return (
    <div className="mx-auto mt-6 max-w-md space-y-4 rounded-3xl bg-white p-6 card-shadow">
      {googleEnabled && (
        <>
          <GoogleAuthButton label="Create account with Google" />
          <p className="text-center text-xs text-muted">
            By continuing with Google, you agree to our{" "}
            <Link href="/terms" className="font-semibold text-ocean">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-semibold text-ocean">
              Privacy Policy
            </Link>
            .
          </p>
          <div className="relative py-1 text-center text-sm text-muted">
            <span className="relative z-10 bg-white px-3">or create with email</span>
            <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-sand-dark" />
          </div>
        </>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <input name="name" required placeholder="Full name" className="w-full rounded-2xl border border-sand-dark bg-sand px-4 py-3" />
        <input name="email" type="email" required placeholder="Email" className="w-full rounded-2xl border border-sand-dark bg-sand px-4 py-3" />
        <input name="password" type="password" minLength={8} required placeholder="Password (8+ characters)" className="w-full rounded-2xl border border-sand-dark bg-sand px-4 py-3" />
        <label className="flex items-start gap-2 text-sm leading-5">
          <input name="acceptTerms" type="checkbox" required className="mt-0.5" />
          <span>
            I agree to SLO Market&apos;s{" "}
            <Link href="/terms" className="font-semibold text-ocean">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-semibold text-ocean">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {error && <p className="text-sm text-clay">{error}</p>}
        <button disabled={loading} className="w-full rounded-2xl bg-ocean py-3 font-semibold text-white">
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-ocean">
          Sign in
        </Link>
      </p>
    </div>
  );
}
