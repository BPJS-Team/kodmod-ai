import Image from "next/image";
import Link from "next/link";
import { ArrowRight, AudioLines, BookOpen, Check, ChevronDown, Keyboard, MessageCircle, ListChecks, TrendingUp } from "lucide-react";
import { Brand } from "@/components/ui";
import LandingMenu from "@/components/LandingMenu";
import { ExperienceToolbar } from "@/components/experience-toolbar";
import { getServerI18n } from "@/lib/server-language";
import "../styles/landing.css";

const navigation = [["#tentang", "Tentang KODMOD"], ["#cara-belajar", "Cara belajar"], ["#untuk-guru", "Untuk guru"], ["#faq", "Pertanyaan umum"]];
const menuKeys: Record<string, string> = { "#tentang": "about", "#cara-belajar": "how", "#untuk-guru": "features", "#faq": "faq" };

export default async function HomePage() {
  const { t } = await getServerI18n();
  return <div className="landing-v2 landing-refined">
    <header className="lp-header"><div className="lp-nav-wrap">
      <Link href="/" className="lp-brand" aria-label="KODMOD" data-voice-menu="home">
        <Image src="/brand/symbol.png" alt="" width={37} height={39} /><span>KODMOD<span className="lp-brand-dot">.</span></span>
      </Link>
      <nav className="lp-desktop-nav" aria-label={t("Navigasi utama")}>
        {navigation.map(([href, label]) => <a href={href} key={href} data-voice-menu={menuKeys[href]}>{t(label)}</a>)}
      </nav>
      <div className="lp-header-actions"><ExperienceToolbar /><Link className="lp-login" href="/masuk" data-voice-menu="login">{t("Masuk")}<ArrowRight size={16} aria-hidden="true" /></Link></div>
      <LandingMenu links={navigation} />
    </div></header>
    <main id="konten-utama" tabIndex={-1}>
      <section className="lp-hero">
        <div className="lp-grid" aria-hidden="true" /><div className="lp-orbit lp-orbit-one" aria-hidden="true" /><div className="lp-orbit lp-orbit-two" aria-hidden="true" />
        <div className="lp-container lp-hero-layout">
          <div className="lp-hero-copy">
            <h1 data-voice-menu="hero-title">{t("Pahami pelajaran,")}<br />{t("selangkah demi selangkah.")}</h1>
            <p data-voice-menu="hero-subtitle">{t("Belajar dari materi guru, tanyakan yang belum kamu pahami, dan berlatih bersama Tutor AI. Pilih teks atau suara yang nyaman untukmu.")}</p>
            <div className="lp-actions">
              <Link href="/daftar" className="lp-btn lp-btn-blue" data-voice-menu="register">{t("Mulai belajar")}<ArrowRight size={18} aria-hidden="true" /></Link>
              <a href="#cara-belajar" className="lp-text-link" data-voice-menu="how">{t("Lihat cara kerjanya")}<ChevronDown size={17} aria-hidden="true" /></a>
            </div>
            <div className="lp-access-chips"><span data-voice-menu="chip-text-voice"><AudioLines size={16} aria-hidden="true" />{t("Teks & suara")}</span><span data-voice-menu="chip-keyboard"><Keyboard size={16} aria-hidden="true" />{t("Navigasi keyboard")}</span></div>
          </div>
          <div className="lp-hero-visual">
            <div className="lp-art-glow" aria-hidden="true" /><Image className="lp-hero-art" src="/images/landing/hero-learning.svg" alt="" width={800} height={800} priority />
            <div className="lp-floating lp-floating-top" data-voice-menu="floating-listen"><span className="lp-icon"><AudioLines size={22} aria-hidden="true" /></span><div>{t("Dengarkan penjelasan")}<small>{t("Jeda, ulangi, atau lanjutkan.")}</small></div></div>
            <div className="lp-floating lp-floating-bottom" data-voice-menu="floating-ask"><span className="lp-icon"><MessageCircle size={21} aria-hidden="true" /></span><div>{t("Tanyakan yang belum paham")}<small>{t("Satu pertanyaan setiap langkah.")}</small></div></div>
          </div>
        </div>
        <div className="lp-principles lp-container" data-voice-menu="principles"><span><BookOpen size={19} aria-hidden="true" />{t("Materi dari guru")}</span><span><MessageCircle size={19} aria-hidden="true" />{t("Tutor yang menemani")}</span><span><ListChecks size={19} aria-hidden="true" />{t("Latihan & penugasan")}</span></div>
      </section>
      <section id="tentang" className="lp-section lp-container">
        <div className="lp-section-heading" data-voice-menu="heading-about"><h2>{t("Semua kebutuhan belajar,")}<br />{t("lebih mudah dijangkau.")}</h2><p>{t("Dirancang untuk siswa tunanetra dan low vision, dengan pendampingan guru.")}</p></div>
        <div className="lp-capability-grid">
          {[
            [BookOpen, "Materi belajar", "Buka materi dari kelasmu dan lanjutkan bacaan dari bagian terakhir.", "feature-materials"],
            [MessageCircle, "Tutor AI", "Bahas materi, minta contoh sederhana, dan dengarkan penjelasannya.", "feature-tutor"],
            [ListChecks, "Latihan & penugasan", "Uji pemahaman melalui latihan dan kuis yang ditugaskan guru.", "feature-practice"],
            [TrendingUp, "Progres belajar", "Lihat hasil belajar dan tentukan bagian yang perlu dilatih lagi.", "feature-progress"],
          ].map(([Icon, title, copy, voiceKey]) => { const FeatureIcon = Icon as typeof BookOpen; return <article key={title as string} className="lp-capability" data-voice-menu={voiceKey as string} tabIndex={0}><span className="lp-feature-icon"><FeatureIcon size={24} aria-hidden="true" /></span><h3>{t(title as string)}</h3><p>{t(copy as string)}</p></article>; })}
        </div>
      </section>
      <section id="cara-belajar" className="lp-flow-section"><div className="lp-container lp-section">
        <div className="lp-section-heading" data-voice-menu="heading-how"><h2>{t("Mulai dari materi,")}<br />{t("lanjutkan dengan rasa ingin tahu.")}</h2><p>{t("Atur suara sekali. Setelah itu, belajar dengan ritmemu sendiri.")}</p></div>
        <div className="lp-flow-layout"><div className="lp-student-art"><Image src="/images/landing/student-voice.svg" alt="" width={960} height={1080} /></div>
          <ol className="lp-steps">{[
            ["Bergabung dengan kelas", "Daftar sebagai siswa, lalu buka kelas yang kamu ikuti.", "step-1"],
            ["Pilih materi belajar", "Baca atau dengarkan materi yang sudah dibagikan guru.", "step-2"],
            ["Tanyakan dan latih pemahamanmu", "Bertanya kepada Tutor, kemudian kerjakan latihan atau tugas.", "step-3"],
            ["Lanjutkan dari progresmu", "Lihat hasil, baca pembahasan yang tersedia, dan lanjutkan belajar.", "step-4"],
          ].map(([title, copy, stepKey], index) => <li key={title} data-voice-menu={stepKey} tabIndex={0}><span className="lp-step-number" aria-hidden="true">{index + 1}</span><div><h3>{t(title)}</h3><p>{t(copy)}</p></div></li>)}</ol>
        </div>
      </div></section>
      <section id="untuk-guru" className="lp-container lp-section lp-teacher"><div>
        <div data-voice-menu="section-teacher">
          <h2>{t("Siapkan pembelajaran.")}<br />{t("Dampingi setiap siswa.")}</h2>
          <p>{t("Kelola kelas, bagikan materi, dan siapkan kuis dengan review sebelum dipublikasikan. Pantau hasil siswa untuk menentukan langkah belajar berikutnya.")}</p>
        </div>
        <ul className="lp-checks">{["Unggah materi dan atur publikasinya", "Review kuis, lalu tugaskan ke kelas", "Pantau hasil dan progres siswa"].map(copy => <li key={copy}><Check size={18} aria-hidden="true" />{t(copy)}</li>)}</ul>
        <Link href="/daftar" className="lp-btn lp-btn-outline" data-voice-menu="register">{t("Daftar sebagai guru")}<ArrowRight size={18} aria-hidden="true" /></Link>
      </div><div className="lp-teacher-art"><Image src="/images/landing/teacher-support.svg" alt="" width={1200} height={900} /></div></section>
      <section className="lp-access-section"><div className="lp-container lp-access-layout"><div><h2>{t("Pilih cara belajar")}<br />{t("yang nyaman untukmu.")}</h2></div>
        <div className="lp-access-items">{[
          [Keyboard, "Keyboard & pembaca layar", "Fokus terlihat, label jelas, dan navigasi berurutan.", "access-1"],
          [BookOpen, "Tampilan yang bisa disesuaikan", "Aktifkan teks lebih besar dan pilihan navigasi geser.", "access-2"],
          [AudioLines, "Kendali suara di tanganmu", "Atur pembaca menu dan suara Tutor secara terpisah.", "access-3"],
        ].map(([Icon, title, copy, accessKey]) => { const AccessIcon = Icon as typeof Keyboard; return <div key={title as string} data-voice-menu={accessKey as string} tabIndex={0}><AccessIcon aria-hidden="true" /><h3>{t(title as string)}</h3><p>{t(copy as string)}</p></div>; })}</div>
      </div></section>
      <section id="faq" className="lp-container lp-section lp-faq"><div><h2>{t("Pertanyaan umum")}</h2><p>{t("Hal yang perlu kamu tahu sebelum mulai.")}</p></div><div className="lp-faq-list">
        {[
          ["Bagaimana cara membuat akun?", "Pilih Daftar, isi nama, username dan kata sandi, lalu pilih peran siswa atau guru. Tidak perlu kode undangan.", "faq-1"],
          ["Apakah saya harus menggunakan suara?", "Kamu bisa menggunakan teks. Pembaca menu dan suara Tutor dapat diatur terpisah dari tombol pengaturan suara.", "faq-2"],
          ["Bisa menggunakan suara dari HP?", "Bisa. Pilih Suara perangkat dalam pengaturan. Ketersediaan suara bergantung pada perangkat dan browsermu.", "faq-3"],
          ["Bagaimana Tutor menggunakan materi?", "Pilih materi kelas di ruang Tutor agar penjelasan mengacu pada materi yang kamu pelajari.", "faq-4"],
          ["Apakah tersedia Bahasa Inggris?", "Pilih EN dari menu bahasa. Tampilan dan jawaban Tutor mengikuti bahasa pilihanmu. Materi guru tetap menggunakan bahasa aslinya.", "faq-5"],
        ].map(([question, answer, faqKey]) => <details key={question} data-voice-menu={faqKey}><summary>{t(question)}<ChevronDown size={19} aria-hidden="true" /></summary><p>{t(answer)}</p></details>)}
      </div></section>
      <section className="lp-cta"><div className="lp-container"><div data-voice-menu="section-cta"><h2>{t("Siap mulai belajar?")}</h2><p>{t("Buat akunmu dan pilih cara belajar yang paling nyaman.")}</p></div><div className="lp-actions"><Link href="/daftar" className="lp-btn lp-btn-blue" data-voice-menu="register">{t("Buat akun")}<ArrowRight size={18} aria-hidden="true" /></Link><Link href="/masuk" className="lp-text-link" data-voice-menu="login">{t("Sudah punya akun?")} {t("Masuk")}</Link></div></div></section>
    </main>
    <footer className="lp-footer lp-container"><div><Brand /><p data-voice-menu="footer-tagline">{t("Ruang belajar untuk semua.")}</p></div><nav aria-label={t("Navigasi footer")}>{navigation.map(([href, label]) => <a href={href} key={href} data-voice-menu={menuKeys[href]}>{t(label)}</a>)}</nav><small>© {new Date().getFullYear()} KODMOD</small></footer>
  </div>;
}
