# Implementasi fondasi Next.js

Rancangan disetujui melalui instruksi "Gas Bikin" setelah rekomendasi fondasi UI, login, dan admin pengguna/undangan. Acuan: blueprint UI/UX dan prototipe admin dalam folder ini.

- [x] Fondasi visual: logo lokal, font lokal, navigasi responsif, fokus keyboard, landing page.
- [x] Sesi: Server Actions, cookie HttpOnly, validasi /auth/me, redirect berdasarkan role, logout.
- [x] Admin: overview dari backend, daftar/filter/tambah/edit/status pengguna, undangan buat/cabut.
- [x] Kondisi kosong, loading, validasi, API offline, akses ditolak, dan sesi tidak valid.
- [x] Build, lint, typecheck, serta verifikasi browser dengan API fixture terisolasi.

Tambahan untuk melengkapi alur undangan: `/daftar` menukar kode undangan melalui `/auth/register`, terbatas pada peran siswa dan guru.

Arsitektur: Server Components membaca API FastAPI menggunakan token cookie server. Server Actions memeriksa ulang sesi dan role sebelum menulis. Token tidak dikirim sebagai props atau disimpan di localStorage. Cookie Secure mengikuti mode production. Tidak ada kredensial demo di aplikasi produksi.

File utama: `src/lib/server-api.ts`, `src/lib/session.ts`, `src/app/actions.ts`, komponen formulir dan shell, serta route `/masuk`, `/admin`, `/admin/pengguna`, `/admin/undangan`, `/siswa`, `/guru`.

Desain: putih, canvas #F3F8FF, navy #103C80, biru #1D63D8, teks #142D4E/#52677F. Plus Jakarta Sans untuk judul dan Source Sans 3 untuk isi. Hero buku menjadi aksen utama; dashboard menggunakan struktur tenang dan data nyata. Analytics/log yang belum memiliki endpoint tidak ditampilkan sebagai data live.

Instruksi terbaru pengguna: commit per progres dengan format `Feat: ...`, tanpa co-author. Belum ada instruksi push untuk progres ini. Pengujian mutasi memakai fixture lokal, bukan database pengguna.

## Hasil verifikasi

- Build production, ESLint, dan typecheck lulus.
- 8 tes HTTP akses lulus dalam dev dan production: anonim, sesi tidak valid, batas peran siswa/guru, data admin, dan token tidak muncul pada HTML.
- Browser production: tombol tampilkan sandi, login, validasi username bentrok (nama/peran tetap tersimpan), pencarian, edit pengguna, pencabutan undangan dan pesan sukses.
- Browser: tambah/nonaktifkan pengguna, buat undangan, daftar dengan kode sampai masuk ke ruang siswa, logout dan penolakan akses admin untuk siswa.
- Enam halaman utama diperiksa pada viewport 320 px tanpa overflow horizontal; login dan dashboard ditinjau visual pada 375 px.
- Backend fixture dihentikan untuk membuktikan pesan offline pada form login.

Belum diverifikasi terhadap database FastAPI asli atau pembaca layar NVDA/TalkBack. Ruang guru/siswa baru halaman sambutan; fitur belajar, integrasi OpenAI/ElevenLabs, analytics sekolah, dan audit log belum diterapkan pada tahap ini.
