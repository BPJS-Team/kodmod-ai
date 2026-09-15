import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/ui";
import { RegisterForm } from "@/components/register-form";
import { session } from "@/lib/session";
import { homeFor } from "@/lib/types";
export default async function RegisterPage() {
  const current = await session();
  if (current) redirect(homeFor(current.user.role));
  return (
    <div className="register-page">
      <header className="site-header">
        <Brand />
        <Link href="/masuk" className="button secondary">
          Masuk
        </Link>
      </header>
      <main id="konten-utama" tabIndex={-1} className="panel register-card">
        <h1>Langkah pertamamu dimulai di sini.</h1>
        <p className="muted">
          Gunakan kode undangan dari administrator sekolah untuk bergabung.
        </p>
        <RegisterForm />
      </main>
    </div>
  );
}
