"use client";

import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
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
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-center font-display text-4xl">Join SLO Market</h1>
      <p className="mt-2 text-center text-muted">Create a free account. Basic listings are always free.</p>
      <form onSubmit={onSubmit} className="mx-auto mt-6 max-w-md space-y-4 rounded-3xl bg-white p-6 card-shadow">
        <input name="name" required placeholder="Full name" className="w-full rounded-2xl border border-sand-dark bg-sand px-4 py-3" />
        <input name="email" type="email" required placeholder="Email" className="w-full rounded-2xl border border-sand-dark bg-sand px-4 py-3" />
        <input name="password" type="password" minLength={8} required placeholder="Password (8+ characters)" className="w-full rounded-2xl border border-sand-dark bg-sand px-4 py-3" />
        {error && <p className="text-sm text-clay">{error}</p>}
        <button disabled={loading} className="w-full rounded-2xl bg-ocean py-3 font-semibold text-white">
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
    </div>
  );
}
