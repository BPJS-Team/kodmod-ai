import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { redirect } from "next/navigation";
import { Brand } from "@/components/ui";
import { LoginForm } from "@/components/forms";
import { session } from "@/lib/session";
import { homeFor } from "@/lib/types";
export default async function LoginPage() {
  const current = await session();
  if (current) redirect(homeFor(current.user.role));
  return (
    <div className="auth-page">
      <aside className="auth-story">
        <Brand />
        <div>
          <BookOpen size={38} strokeWidth={1.3} aria-hidden="true" />
          <h2>
            Selalu ada cara
            <br />
            untuk memahami.
          </h2>
          <p>
            Satu pertanyaan kecil bisa menjadi awal dari pemahaman yang besar.
          </p>
        </div>
        <span>Belajar. Bertanya. Bertumbuh.</span>
      </aside>
      <main id="konten-utama" tabIndex={-1} className="auth-main">
        <Link className="back-link" href="/">
          <ArrowLeft size={17} aria-hidden="true" /> Kembali ke beranda
        </Link>
        <div className="auth-card">
          <div className="mobile-brand">
            <Brand />
          </div>
          <h1>Senang bertemu lagi.</h1>
          <p className="auth-description">
            Masuk untuk melanjutkan perjalananmu di KODMOD.
          </p>
          <LoginForm />
          <div className="auth-footnote">
            Satu akun, ruang yang sesuai dengan peranmu.
          </div>
        </div>
        <p className="auth-copyright">
          KODMOD · Pendidikan yang lebih inklusif
        </p>
      </main>
    </div>
  );
}
