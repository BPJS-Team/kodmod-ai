import Link from "next/link";
export default function NotFound() {
  return (
    <div className="error-page">
      <h1>Halaman tidak ditemukan.</h1>
      <p>Halaman atau data ini mungkin sudah tidak tersedia.</p>
      <Link href="/" className="button primary">
        Kembali ke beranda
      </Link>
    </div>
  );
}
