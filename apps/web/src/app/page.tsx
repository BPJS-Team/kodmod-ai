import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  BookOpen,
  Keyboard,
  MessagesSquare,
  Sparkles,
} from "lucide-react";
import { Brand } from "@/components/ui";

export default function HomePage() {
  return (
    <div className="landing">
      <header className="site-header">
        <Brand />
        <nav aria-label="Navigasi utama">
          <a href="#cara-belajar">Cara belajar</a>
          <a href="#untuk-guru">Untuk guru</a>
          <Link className="button primary" href="/masuk">
            Masuk <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </nav>
      </header>
      <main id="konten-utama" tabIndex={-1}>
        <section className="hero">
          <div className="hero-copy">
            <div className="welcome-label">
              <BookOpen size={17} aria-hidden="true" /> Ruang belajar untuk
              semua
            </div>
            <h1>
              Setiap pertanyaan
              <br />
              membuka pemahaman.
            </h1>
            <p>
              Belajar dengan suara. Bertanya dengan leluasa. KODMOD menemani
              setiap langkahmu memahami pelajaran, dengan caramu sendiri.
            </p>
            <div className="hero-actions">
              <Link href="/masuk" className="button primary">
                Mulai belajar <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <a href="#cara-belajar" className="button secondary">
                Kenali KODMOD
              </a>
            </div>
            <div className="hero-note">
              <Keyboard size={17} aria-hidden="true" /> Dirancang untuk siswa
              tunanetra dan low vision.
            </div>
          </div>
          <div className="book-scene">
            <div className="book-caption">
              <Sparkles size={16} aria-hidden="true" /> Dari rasa ingin tahu,
              menjadi mengerti.
            </div>
            <div className="open-book">
              <div className="book-cover">
                <Image src="/brand/symbol.png" alt="" width={60} height={63} />
                <span>Matematika</span>
                <h2>“Kenapa satu per dua sama dengan dua per empat?”</h2>
                <p>
                  Pertanyaan sederhana.
                  <br />
                  Makna yang lebih dalam.
                </p>
              </div>
              <div className="book-paper">
                <div className="tutor-label">
                  <AudioLines size={20} aria-hidden="true" /> KODMOD
                </div>
                <p>
                  Bayangkan selembar kertas dibagi dua. Jika setiap bagian
                  dibagi dua lagi, apa yang berubah?
                </p>
                <div className="book-bottom">
                  <MessagesSquare size={17} aria-hidden="true" />
                  <span>Contoh pendekatan tutor</span>
                </div>
              </div>
            </div>
            <div className="book-shadow" />
          </div>
        </section>
        <section id="cara-belajar" className="landing-section">
          <div className="section-intro">
            <h2>
              Punya ruang untuk bertanya.
              <br />
              Punya waktu untuk memahami.
            </h2>
            <p>
              Langkah belajar yang jelas, dengan pendampingan guru di sepanjang
              perjalanan.
            </p>
          </div>
          <div className="learning-steps">
            {[
              [
                "Pilih materi",
                "Mulai dari pelajaran yang telah disiapkan guru.",
              ],
              [
                "Ajak berdiskusi",
                "Sampaikan pertanyaan melalui teks atau suara.",
              ],
              [
                "Latih pemahaman",
                "Kerjakan latihan dan pelajari pembahasannya.",
              ],
              [
                "Kenali progres",
                "Temukan bagian yang dipahami dan perlu diulang.",
              ],
            ].map(([title, desc], i) => (
              <div key={title}>
                <span className="step-number">{i + 1}</span>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </section>
        <section id="untuk-guru" className="teacher-section">
          <div>
            <span className="welcome-label">Untuk guru dan sekolah</span>
            <h2>
              Teknologi mendampingi.
              <br />
              Guru tetap memegang peran.
            </h2>
            <p>
              Siapkan ruang belajar, kelola akses siswa, dan bangun pengalaman
              belajar yang lebih inklusif bersama KODMOD.
            </p>
            <Link href="/masuk" className="button primary">
              Masuk sebagai pendamping{" "}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
          <div className="access-list">
            <div>
              <Keyboard />
              <h3>Navigasi yang jelas</h3>
              <p>Dapat digunakan dengan keyboard dan pembaca layar.</p>
            </div>
            <div>
              <BookOpen />
              <h3>Teks tetap tersedia</h3>
              <p>
                Informasi penting disampaikan dalam bentuk yang bisa dibaca.
              </p>
            </div>
            <div>
              <AudioLines />
              <h3>Kontrol di tangan siswa</h3>
              <p>Pendekatan suara dan teks mengikuti kebutuhan belajar.</p>
            </div>
          </div>
        </section>
        <section className="landing-section faq">
          <h2>Sebelum mulai belajar</h2>
          {[
            [
              "Bagaimana cara mendapatkan akun?",
              "Administrator sekolah membuat akun dan memberikan informasi masuk. Hubungi sekolah jika Anda belum memiliki akses.",
            ],
            [
              "Apakah harus menggunakan suara?",
              "Tidak. KODMOD dirancang agar navigasi dan informasi utama dapat diakses melalui teks dan keyboard.",
            ],
            [
              "Siapa yang mendampingi proses belajar?",
              "Guru menyiapkan arah pembelajaran, sedangkan KODMOD membantu siswa memahami materi melalui pertanyaan dan latihan.",
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </section>
      </main>
      <footer className="site-footer">
        <Brand />
        <p>Ruang belajar yang membuka kesempatan.</p>
        <span>© {new Date().getFullYear()} KODMOD</span>
      </footer>
    </div>
  );
}
