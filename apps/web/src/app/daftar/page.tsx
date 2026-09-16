import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "@/components/register-form";
import { session } from "@/lib/session";
import { homeFor } from "@/lib/types";
export default async function RegisterPage() {
  const current = await session();
  if (current) redirect(homeFor(current.user.role));
  return (
    <AuthShell register>
      <span className="auth-label">Mulai perjalananmu</span>
      <h1>Ruang baru untuk bertumbuh.</h1>
      <p className="auth-description">
        Gunakan kode undangan dari administrator sekolah untuk bergabung.
      </p>
      <RegisterForm />
    </AuthShell>
  );
}
