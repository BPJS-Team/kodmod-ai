import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Keyboard } from "lucide-react";
import type { ReactNode } from "react";
import { Brand } from "./ui";
import { ExperienceToolbar } from "./experience-toolbar";
import { getServerI18n } from "@/lib/server-language";

export async function AuthShell({
  children,
  register = false,
}: {
  children: ReactNode;
  register?: boolean;
}) {
  const { t } = await getServerI18n();
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
            {t("Belajar sesuai caramu.")}
          </h2>
          <p>
            {t("Materi, Tutor, dan latihan dalam satu ruang belajar.")}
          </p>
        </div>
        <span className="auth-access">
          <Keyboard size={18} aria-hidden="true" /> {t("Teks & suara")}
        </span>
      </aside>
      <main id="konten-utama" tabIndex={-1} className="auth-main">
        <div className="auth-topbar"><Link className="back-link" href="/" data-voice-menu="home">
          <ArrowLeft size={17} aria-hidden="true" /> {t("Kembali ke beranda")}
        </Link><ExperienceToolbar /></div>
        <div className="auth-card">
          <div className="mobile-brand">
            <Brand />
          </div>
          {children}
        </div>
        <p className="auth-copyright">
          KODMOD · {t("Ruang belajar untuk semua.")}
        </p>
      </main>
    </div>
  );
}
