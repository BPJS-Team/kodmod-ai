"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="panel learning-section">
      <h1>Ruang belajar belum dapat dimuat.</h1>
      <p className="muted">
        Koneksi layanan sedang bermasalah. Data Anda tetap tersimpan. Coba muat
        ulang beberapa saat lagi.
      </p>
      <button className="button primary" onClick={reset}>
        Coba lagi
      </button>
    </section>
  );
}
