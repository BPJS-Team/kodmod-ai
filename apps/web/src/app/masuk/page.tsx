import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/forms";
import { session } from "@/lib/session";
import { homeFor } from "@/lib/types";
export default async function LoginPage() {
  const current = await session();
  if (current) redirect(homeFor(current.user.role));
  return (
    <AuthShell>
      <span className="auth-label">Ruang belajar Anda</span>
      <h1>Senang bertemu lagi.</h1>
      <p className="auth-description">
        Masuk untuk melanjutkan perjalananmu di KODMOD.
      </p>
      <LoginForm />
    </AuthShell>
  );
}
