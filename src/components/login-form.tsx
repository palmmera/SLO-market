"use client";

import { GoogleAuthButton } from "@/components/google-auth-button";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  return (
    <Suspense>
      <LoginFormInner googleEnabled={googleEnabled} />
    </Suspense>
  );
}

function LoginFormInner({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(form.get("email")),
      password: String(form.get("password")),
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Email or password is incorrect, or this account is suspended.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="mx-auto mt-6 max-w-md space-y-4 rounded-3xl bg-white p-6 card-shadow">
      {googleEnabled && (
        <>
          <GoogleAuthButton callbackUrl={callbackUrl} label="Sign in with Google" />
          <div className="relative py-1 text-center text-sm text-muted">
            <span className="relative z-10 bg-white px-3">or continue with email</span>
            <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-sand-dark" />
          </div>
        </>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <input name="email" type="email" required placeholder="Email" className="w-full rounded-2xl border border-sand-dark bg-sand px-4 py-3" />
        <input name="password" type="password" required placeholder="Password" className="w-full rounded-2xl border border-sand-dark bg-sand px-4 py-3" />
        {error && <p className="text-sm text-clay">{error}</p>}
        <button disabled={loading} className="w-full rounded-2xl bg-ocean py-3 font-semibold text-white">
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p className="text-center text-sm text-muted">
        New to SLO Market?{" "}
        <Link href="/register" className="font-semibold text-ocean">
          Create an account
        </Link>
      </p>
    </div>
  );
}
