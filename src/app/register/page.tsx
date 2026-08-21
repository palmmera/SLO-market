import { RegisterForm } from "@/components/register-form";
import { isGoogleAuthEnabled } from "@/lib/auth";

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-center font-display text-4xl">Join SLO Market</h1>
      <p className="mt-2 text-center text-muted">Create a free account. Basic listings are always free.</p>
      <RegisterForm googleEnabled={isGoogleAuthEnabled()} />
    </div>
  );
}
