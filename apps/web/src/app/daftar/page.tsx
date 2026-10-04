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
      <h1>Buat akun KODMOD</h1>
      <p className="auth-description">
        Pilih peranmu dan mulai belajar atau mengajar.
      </p>
      <RegisterForm />
    </AuthShell>
  );
}
