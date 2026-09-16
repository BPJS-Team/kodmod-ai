import Link from "next/link";
import { BookOpen } from "lucide-react";
export default function NotFound() {
  return (
    <main id="konten-utama" tabIndex={-1} className="error-page">
      <BookOpen size={48} aria-hidden="true" />
      <h1>Halaman tidak ditemukan.</h1>
      <p>Halaman atau data ini mungkin sudah tidak tersedia.</p>
      <Link href="/" className="button primary">
        Kembali ke beranda
      </Link>
    </main>
  );
}
