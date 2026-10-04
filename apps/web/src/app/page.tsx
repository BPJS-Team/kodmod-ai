import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  AudioLines,
  BookOpen,
  Check,
  ChevronDown,
  Keyboard,
  Sparkles,
} from "lucide-react";
import { Brand } from "@/components/ui";
import LandingMenu from "@/components/LandingMenu";
import "../styles/landing.css";

const navigation = [
  ["#tentang", "Tentang"],
  ["#cara-belajar", "Cara belajar"],
  ["#untuk-guru", "Untuk guru"],
  ["#faq", "FAQ"],
];
const steps = [
  [
    "Temukan titik mulamu",
    "Pilih materi yang disiapkan guru. Mulai dari hal yang ingin kamu pahami.",
  ],
  [
    "Ubah penasaran jadi percakapan",
    "Bertanya, menelusuri contoh, dan membahas pelajaran selangkah demi selangkah.",
  ],
  [
    "Coba. Pahami. Ulangi.",
    "Latihan dan pembahasan membantu menemukan bagian yang masih perlu dipelajari.",
  ],
  [
    "Melangkah bersama guru",
    "Jadikan perkembangan belajar sebagai bahan pendampingan berikutnya.",
  ],
];

export default function HomePage() {
  return (
    <div className="landing-v2">
      <header className="lp-header">
        <div className="lp-nav-wrap">
          <Link
            href="/"
            className="lp-brand"
            aria-label="KODMOD, halaman utama"
          >
            <Image src="/brand/symbol.png" alt="" width={37} height={39} />
            <span>
              KODMOD<span className="lp-brand-dot">.</span>
            </span>
          </Link>
          <nav className="lp-desktop-nav" aria-label="Navigasi utama">
            {navigation.map(([href, label]) => (
              <a href={href} key={href}>
                {label}
              </a>
            ))}
          </nav>
          <Link className="lp-login" href="/masuk">
            Masuk <ArrowRight size={16} />
          </Link>
          <LandingMenu links={navigation} />
        </div>
      </header>
      <main id="konten-utama" tabIndex={-1}>
        <section className="lp-hero">
          <div className="lp-grid" aria-hidden="true" />
          <div className="lp-orbit lp-orbit-one" aria-hidden="true" />
          <div className="lp-orbit lp-orbit-two" aria-hidden="true" />
          <div className="lp-container lp-hero-layout">
            <div className="lp-hero-copy">
              <div className="lp-eyebrow">
                <span className="lp-live-dot" /> BELAJAR TANPA BATAS
              </div>
              <h1>
                Dunia penuh
                <br />
                pengetahuan.
                <br />
                <span>Terbuka untukmu.</span>
              </h1>
              <p>
                Rasa ingin tahu milik semua orang. KODMOD dirancang sebagai
                teman belajar AI bagi siswa tunanetra dan low vision, dengan
                guru di setiap langkahnya.
              </p>
              <div className="lp-actions">
                <Link href="/masuk" className="lp-btn lp-btn-blue">
                  Masuk ruang belajar <ArrowRight size={18} />
                </Link>
                <a href="#cara-belajar" className="lp-text-link">
                  Jelajahi KODMOD <ArrowDown size={17} />
                </a>
              </div>
              <div className="lp-hero-footnote">
                <Keyboard size={16} /> Berpusat pada aksesibilitas. Berawal dari
                rasa ingin tahu.
              </div>
            </div>
            <div className="lp-hero-visual">
              <div className="lp-art-glow" aria-hidden="true" />
              <Image
                className="lp-hero-art"
                src="/images/landing/hero-learning.svg"
                alt=""
                width={800}
                height={800}
                priority
              />
              <div className="lp-floating lp-floating-top">
                <span className="lp-icon">
                  <AudioLines size={22} />
                </span>
                <div>
                  Setiap suara berarti<small>Ruang untuk bertanya</small>
                </div>
              </div>
              <div className="lp-floating lp-floating-bottom">
                <span className="lp-icon">
                  <Sparkles size={22} />
                </span>
                <div>
                  Satu langkah lebih paham<small>Belajar dengan caramu</small>
                </div>
              </div>
              <span className="lp-art-caption">01 / RUANG PENGETAHUAN</span>
            </div>
          </div>
          <div className="lp-principles lp-container">
            <span>
              <BookOpen size={19} /> Materi yang terarah
            </span>
            <span>
              <AudioLines size={19} /> Pendekatan berbasis percakapan
            </span>
            <span>
              <Keyboard size={19} /> Akses yang lebih setara
            </span>
          </div>
        </section>
        <section id="tentang" className="lp-section lp-container lp-intro">
          <div>
            <span className="lp-kicker">KENALI KODMOD</span>
            <h2>
              Bukan sekadar jawaban.
              <br />
              <span>Ruang untuk memahami.</span>
            </h2>
          </div>
          <div>
            <p>
              Setiap siswa punya ritme dan cara belajar sendiri. Kami merancang
              ruang yang menghubungkan materi, percakapan, dan pendampingan agar
              proses memahami terasa lebih dekat.
            </p>
            <p className="lp-small">
              Untuk siswa tunanetra dan low vision. Bersama guru dan sekolah
              yang percaya pada kesempatan belajar yang setara.
            </p>
          </div>
        </section>
        <section id="cara-belajar" className="lp-flow-section">
          <div className="lp-container lp-section">
            <div className="lp-section-heading">
              <div>
                <span className="lp-kicker">PERJALANAN BELAJAR</span>
                <h2>
                  Dari “belum mengerti”
                  <br />
                  ke “oh, begitu.”
                </h2>
              </div>
              <p>
                Alur yang kami bangun untuk menemani
                <br /> setiap proses memahami.
              </p>
            </div>
            <div className="lp-flow-layout">
              <div className="lp-student-art">
                <Image
                  src="/images/landing/student-voice.svg"
                  alt=""
                  width={960}
                  height={1080}
                />
                <div className="lp-art-overlay">
                  <span className="lp-eyebrow">
                    SELALU ADA CARA UNTUK BELAJAR
                  </span>
                  <h3>
                    Rasa ingin tahumu.
                    <br />
                    Langkah pertamamu.
                  </h3>
                </div>
              </div>
              <ol className="lp-steps">
                {steps.map(([title, text], index) => (
                  <li key={title}>
                    <span className="lp-step-number">0{index + 1}</span>
                    <div>
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
        <section id="untuk-guru" className="lp-container lp-section lp-teacher">
          <div>
            <span className="lp-kicker">UNTUK GURU & SEKOLAH</span>
            <h2>
              Teknologi mendampingi.
              <br />
              <span>Guru tetap berarti.</span>
            </h2>
            <p>
              Hubungan belajar tetap dimulai dari manusia. KODMOD dikembangkan
              untuk membantu guru menyiapkan pembelajaran dan mendampingi
              kebutuhan setiap siswa.
            </p>
            <ul className="lp-checks">
              <li>
                <Check size={18} /> Materi sebagai titik awal percakapan
              </li>
              <li>
                <Check size={18} /> Latihan untuk mengenali pemahaman
              </li>
              <li>
                <Check size={18} /> Progres sebagai arah pendampingan
              </li>
            </ul>
            <Link href="/masuk" className="lp-btn lp-btn-outline">
              Masuk sebagai pendamping <ArrowRight size={18} />
            </Link>
          </div>
          <div className="lp-teacher-art">
            <Image
              src="/images/landing/teacher-support.svg"
              alt=""
              width={1200}
              height={900}
            />
            <span className="lp-art-caption">03 / TUMBUH BERSAMA</span>
          </div>
        </section>
        <section className="lp-access-section">
          <div className="lp-container lp-access-layout">
            <div>
              <span className="lp-kicker">AKSESIBILITAS SEJAK AWAL</span>
              <h2>
                Cara belajar boleh berbeda.
                <br />
                Kesempatannya harus setara.
              </h2>
            </div>
            <div className="lp-access-items">
              <div>
                <Keyboard />
                <h3>Nyaman dengan keyboard</h3>
                <p>Navigasi berurutan dan fokus yang terlihat jelas.</p>
              </div>
              <div>
                <BookOpen />
                <h3>Informasi tetap terbaca</h3>
                <p>Struktur teks dan label yang membantu pembaca layar.</p>
              </div>
              <div>
                <AudioLines />
                <h3>Kamu yang memegang kendali</h3>
                <p>Tanpa audio yang diputar otomatis saat membuka halaman.</p>
              </div>
            </div>
          </div>
        </section>
        <section id="faq" className="lp-container lp-section lp-faq">
          <div>
            <span className="lp-kicker">ADA PERTANYAAN?</span>
            <h2>
              Mari kenali <br />
              lebih dekat.
            </h2>
            <p>
              Beberapa hal sebelum <br />
              memulai perjalananmu.
            </p>
          </div>
          <div className="lp-faq-list">
            {[
              [
                "Untuk siapa KODMOD dirancang?",
                "KODMOD berfokus pada kebutuhan belajar siswa tunanetra dan low vision, serta guru dan sekolah yang mendampingi mereka.",
              ],
              [
                "Bagaimana cara mendapatkan akun?",
                "Pilih Daftar, isi nama, username dan kata sandi, lalu pilih peran siswa atau guru. Jika sudah memiliki akun, pilih Masuk.",
              ],
              [
                "Apakah semua fitur belajar sudah tersedia?",
                "KODMOD sedang dikembangkan bertahap. Akses akun sudah disiapkan; tutor AI, percakapan suara, latihan, dan pemantauan progres masih dalam pengembangan. Alur pada halaman ini menggambarkan pengalaman yang sedang kami bangun.",
              ],
              [
                "Apakah siswa harus menggunakan suara?",
                "Tidak. Pengalaman belajar dirancang dengan pilihan teks dan navigasi keyboard. Suara akan menjadi pilihan tambahan, sesuai kebutuhan dan kenyamanan siswa.",
              ],
              [
                "Apakah AI akan menggantikan guru?",
                "Tidak. AI dirancang sebagai pendamping untuk membantu proses belajar. Guru tetap berperan dalam menyiapkan pembelajaran dan memberi arahan kepada siswa.",
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <ChevronDown size={19} />
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="lp-cta">
          <div className="lp-container">
            <span className="lp-eyebrow">
              LANGKAH KECIL. KEMUNGKINAN BESAR.
            </span>
            <h2>
              Pengetahuan membuka dunia.
              <br />
              <span>Mari buka bersama.</span>
            </h2>
            <p>Sudah punya akun? Ruang belajarmu dimulai di sini.</p>
            <Link href="/masuk" className="lp-btn lp-btn-blue">
              Masuk ke KODMOD <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>
      <footer className="lp-footer lp-container">
        <div>
          <Brand />
          <p>Ruang belajar yang membuka kesempatan.</p>
        </div>
        <nav aria-label="Navigasi footer">
          {navigation.map(([href, label]) => (
            <a href={href} key={href}>
              {label}
            </a>
          ))}
        </nav>
        <small>© {new Date().getFullYear()} KODMOD</small>
      </footer>
    </div>
  );
}
