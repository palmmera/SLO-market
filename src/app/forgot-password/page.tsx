import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata: Metadata = { title: "Reset your password | SLO Market" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="font-display text-3xl">Reset your password</h1>
      <p className="mt-2 text-sm text-muted">
        Enter the email you use for SLO Market and we&apos;ll send you a link to set a new password.
      </p>
      <ForgotPasswordForm />
    </div>
  );
}
