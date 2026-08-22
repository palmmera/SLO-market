import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata: Metadata = { title: "Set a new password | SLO Market" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="font-display text-3xl">Set a new password</h1>
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="mt-4 rounded-2xl bg-clay/10 p-4 text-sm text-clay">
          This reset link is missing its token. Please open the link from your email, or{" "}
          <Link href="/forgot-password" className="font-semibold underline">
            request a new one
          </Link>
          .
        </div>
      )}
    </div>
  );
}
