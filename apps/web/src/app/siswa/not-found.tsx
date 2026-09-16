import Link from "next/link";
export default function NotFound() {
  return (
    <section className="panel learning-section">
      <h1>Ruang ini tidak tersedia.</h1>
      <p className="muted">
        Kelas atau materi mungkin sudah diarsipkan, belum diterbitkan, atau
        tidak dapat diakses akun Anda.
      </p>
      <Link className="button primary" href="/siswa/kelas">
        Kembali ke kelas saya
      </Link>
    </section>
  );
}
