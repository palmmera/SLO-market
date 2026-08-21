import { LoginForm } from "@/components/login-form";
import { isGoogleAuthEnabled } from "@/lib/auth";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-center font-display text-4xl">Welcome back</h1>
      <p className="mt-2 text-center text-muted">Sign in to buy, sell, and message neighbors across SLO County.</p>
      <LoginForm googleEnabled={isGoogleAuthEnabled()} />
    </div>
  );
}
