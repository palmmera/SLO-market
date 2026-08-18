"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
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
    router.push(params.get("callbackUrl") || "/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-6 max-w-md space-y-4 rounded-3xl bg-white p-6 card-shadow">
      <input name="email" type="email" required placeholder="Email" className="w-full rounded-2xl border border-sand-dark bg-sand px-4 py-3" />
      <input name="password" type="password" required placeholder="Password" className="w-full rounded-2xl border border-sand-dark bg-sand px-4 py-3" />
      {error && <p className="text-sm text-clay">{error}</p>}
      <button disabled={loading} className="w-full rounded-2xl bg-ocean py-3 font-semibold text-white">
        {loading ? "Signing in..." : "Sign in"}
      </button>
      <p className="text-center text-sm text-muted">
        New to SLO Market?{" "}
        <Link href="/register" className="font-semibold text-ocean">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-center font-display text-4xl">Welcome back</h1>
      <p className="mt-2 text-center text-muted">Sign in to buy, sell, and message neighbors across SLO County.</p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
