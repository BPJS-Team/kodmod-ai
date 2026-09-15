"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="konten-utama" tabIndex={-1} className="error-page">
      <h1>Ruang ini belum dapat dimuat.</h1>
      <p>
        Layanan mungkin sedang tidak tersedia. Coba muat ulang beberapa saat
        lagi.
      </p>
      <div className="hero-actions">
        <button className="button primary" onClick={reset}>
          Coba lagi
        </button>
        <Link href="/" className="button secondary">
          Ke beranda
        </Link>
      </div>
    </main>
  );
}
