import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Keyboard } from "lucide-react";
import type { ReactNode } from "react";
import { Brand } from "./ui";

export function AuthShell({
  children,
  register = false,
}: {
  children: ReactNode;
  register?: boolean;
}) {
  return (
    <div className={`auth-page${register ? " auth-register" : ""}`}>
      <aside className="auth-story">
        <Brand />
        <div className="auth-story-content">
          <Image
            className="auth-illustration"
            src="/images/landing/hero-learning.svg"
            alt=""
            width={800}
            height={800}
            priority
          />
          <h2>
            {register
              ? "Langkah kecil.\nDunia yang terbuka."
              : "Selalu ada cara\nuntuk memahami."}
          </h2>
          <p>
            Satu pertanyaan kecil bisa menjadi awal dari pemahaman yang besar.
          </p>
        </div>
        <span className="auth-access">
          <Keyboard size={18} aria-hidden="true" /> Belajar. Bertanya.
          Bertumbuh.
        </span>
      </aside>
      <main id="konten-utama" tabIndex={-1} className="auth-main">
        <Link className="back-link" href="/">
          <ArrowLeft size={17} aria-hidden="true" /> Kembali ke beranda
        </Link>
        <div className="auth-card">
          <div className="mobile-brand">
            <Brand />
          </div>
          {children}
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
