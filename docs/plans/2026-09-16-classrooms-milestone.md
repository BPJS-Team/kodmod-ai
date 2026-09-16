# Milestone kelas dan materi teks

16 September 2026. Kelanjutan tahap 1 pada peta scope.

## Implementasi

- Dashboard guru dan siswa menggantikan halaman sambutan sementara. Jumlah kelas, materi, dan keanggotaan berasal dari API. Keanggotaan bukan jumlah siswa unik lintas kelas; materi guru termasuk draft.
- Shell navy/biru, navigasi Dashboard dan Kelas saya, kartu kelas, tampilan kosong, loading, halaman gagal, dan halaman tanpa akses.
- Guru membuat kelas, menambahkan akun siswa lewat username, mencabut keanggotaan, serta mengarsipkan/mengaktifkan kelas.
- Guru membuat dan mengedit materi teks, mengimpor isi berkas `.txt` UTF-8 ke editor, menyimpan draft, menerbitkan, atau mengembalikan materi ke draft.
- Siswa hanya melihat kelas aktif yang diikuti dan membaca materi terbit. Daftar identitas anggota tidak dikirim kepada siswa.
- SweetAlert2 bertema untuk perubahan data dan penggantian isi editor saat impor; hasil tindakan ditampilkan sebagai dialog dan pesan inline. Navigasi tetap langsung.
- Backend memakai `Classroom`, `Enrollment`, `ClassMaterial`, dan `ClassActivity`. Audit mencatat aktor, kelas, tindakan, target, dan waktu untuk mutasi kelas/anggota/materi.
- Materi kelas terpisah dari Subject dan penyimpanan kurikulum/RAG global. Tidak otomatis masuk ke pengetahuan tutor AI.

## API dan akses

| Endpoint | Kegunaan |
| --- | --- |
| `GET/POST /classes` | Daftar kelas sesuai peran / buat kelas guru |
| `GET/PATCH /classes/{id}` | Detail kelas / ubah metadata atau status arsip |
| `POST /classes/{id}/members` | Tambah siswa aktif dengan username |
| `DELETE /classes/{id}/members/{student_id}` | Cabut akses siswa |
| `POST /classes/{id}/materials` | Buat draft atau materi terbit |
| `GET/PUT /classes/{id}/materials/{material_id}` | Baca / ubah materi |

Semua route memerlukan sesi. Mutasi hanya untuk guru pemilik. Akses materi memeriksa kelas, keanggotaan, arsip, dan status terbit. ID materi dari kelas lain tidak dapat dipakai dengan mengganti path kelas. Siswa dan guru lain tidak bisa mengelola kelas. Ruang admin belum diberi pengelolaan kelas pada milestone ini.

## Menjalankan pada lingkungan pengembangan

1. Pasang dependency backend sesuai panduan proyek; test tambahan memakai `aiosqlite` dari extra `test`.
2. Pastikan PostgreSQL pengembangan dan konfigurasi backend benar. Tinjau migrasi `0002_classrooms`, lalu jalankan `python -m alembic upgrade head` dari `apps/ai-engine` pada database pengembangan yang dituju.
3. Mulai ulang backend agar router `/classes` dimuat. Next.js memakai `API_ORIGIN` yang sudah digunakan untuk autentikasi.
4. Jalankan `npm run dev:web`. Masuk dengan akun guru dan buka `/guru/kelas`; akun siswa menggunakan `/siswa/kelas`.

Migrasi database aplikasi **belum dijalankan** dalam pengerjaan ini. Tidak membuat akun atau data percobaan di database aplikasi. Migrasi awal dibatasi pada tabel baseline agar instalasi baru tidak menduplikasi tabel milik revisi kedua.

## Bukti verifikasi

- `npm run lint --workspace @kodmod/web`: lulus.
- `npm run build --workspace @kodmod/web`: lulus, termasuk pemeriksaan TypeScript dan route baru.
- `python -m unittest tests.classroom_test -v`: lima skenario lulus dengan FastAPI asli, SQLite memori, dan foreign key aktif. User dependency diganti aktor pengujian; pengujian ini tidak menguji JWT login atau PostgreSQL nyata.
- Skenario mencakup pemilik kelas, siswa di luar kelas, draft, publikasi/pembatalan publikasi, materi lintas kelas, pencabutan anggota, duplikasi anggota, arsip/aktivasi kembali, validasi, dan pencatatan audit.
- Ruff pada perubahan backend lulus.
- `python -m alembic upgrade head --sql`: berhasil menghasilkan SQL PostgreSQL dari baseline sampai revisi kedua tanpa koneksi database. Keempat tabel baru masing-masing dibuat sekali. Ini verifikasi SQL, bukan eksekusi migrasi PostgreSQL.
- Browser lokal: akses tanpa sesi ke `/guru/kelas` dialihkan ke `/masuk`. Tampilan dan transaksi halaman kelas setelah login belum diverifikasi melalui browser terhadap backend/database nyata.

## Pemeriksaan integrasi berikutnya

- Terapkan migrasi pada database pengembangan terisolasi, lalu jalankan alur guru membuat kelas → menambah siswa → menerbitkan materi → siswa membaca → guru mencabut akses.
- Uji konfirmasi batal, kegagalan API, keyboard, pembaca layar, dan tampilan sempit pada halaman yang sudah login.
- Selesaikan pengujian transaksi frontend terisolasi; build dan pengujian route backend tidak menggantikan pengujian ini.

## Scope yang masih terbuka

- Edit metadata kelas melalui UI (API sudah tersedia), pencarian/filter/paginasi, dan pengelolaan kelas oleh admin.
- PDF/DOCX, penyimpanan berkas asli, progres unggahan/pemrosesan, penghapusan materi, serta indeks RAG dengan isolasi kelas.
- Progres baca siswa dan analitik hasil belajar; dashboard saat ini hanya ringkasan kelas/materi.
- Tutor ChatGPT berdasarkan materi kelas, tugas/kuis guru, percobaan siswa, dan penilaian.
- ElevenLabs TTS, STT, serta preferensi aksesibilitas.
- Layar activity log admin, evaluasi provider, staging dan kesiapan rilis.

Status: implementasi fondasi kelas dan materi teks tersedia beserta pengujian backend terisolasi; integrasi produksi dan keseluruhan tahap 1 belum dinyatakan selesai.
