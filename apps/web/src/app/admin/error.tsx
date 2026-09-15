"use client";
export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <div className="panel empty" role="alert">
      <h1>Data belum dapat dimuat.</h1>
      <p>
        Periksa koneksi layanan, lalu coba kembali. Perubahan yang belum dikirim
        tidak disimpan.
      </p>
      <button className="button primary" onClick={reset}>
        Muat ulang data
      </button>
    </div>
  );
}
