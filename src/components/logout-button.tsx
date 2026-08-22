"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="mt-6 block w-full rounded-2xl bg-white py-3 text-center font-semibold card-shadow"
    >
      Sign out
    </button>
  );
}
