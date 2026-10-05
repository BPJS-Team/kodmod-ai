# Scope siswa: pustaka dan progres bacaan

Pembaruan 18 September: [preferensi bacaan tersimpan per akun pada browser yang sama](2026-09-18-reading-preferences.md). Batas pengaturan per halaman di laporan awal berikut sudah diperluas; sinkronisasi antarperangkat tetap belum tersedia.

## Yang diimplementasikan

- `/siswa/materi`: pustaka materi terbit dari kelas aktif yang diikuti siswa. Cari judul/kelas/mapel, filter kelas, belum selesai, sudah dipelajari, dan bookmark. Daftar ditampilkan bertahap 12 item; pencarian/filter berjalan di browser atas metadata yang dikirim API.
- Dashboard siswa: jumlah materi ditandai selesai dibanding seluruh materi yang masih dapat diakses, tautan ke materi belum selesai, dan pintasan pustaka.
- Pembaca: ukuran teks 18/20/24/28 px, kontras tinggi, status bacaan, bookmark dan tanda sudah dipelajari dengan konfirmasi SweetAlert2. Pengaturan tampilan berlaku untuk halaman bacaan saat ini, belum disimpan sebagai preferensi akun.
- Status selesai dapat dibatalkan; bookmark dapat dihapus. Status adalah pengakuan pribadi siswa, bukan nilai kuis, durasi membaca, atau estimasi penguasaan.
- Progress disimpan per pasangan materi dan siswa. Backend mengambil identitas dari sesi, bukan input browser. Guru tidak dapat menulis progres siswa melalui endpoint ini.

## Kontrak backend

- `GET /classes/student/materials`: metadata, kelas/mapel, dan progres pribadi. Isi lengkap tidak dikirim dalam daftar.
- `GET /classes/{class_id}/materials/{material_id}`: isi materi beserta progres milik siswa yang sedang login.
- `PATCH /classes/{class_id}/materials/{material_id}/progress`: ubah `completed` dan/atau `bookmarked`; properti lain ditolak. Menetapkan nilai yang sama tidak membalik status. Tanggal selesai tidak berubah karena permintaan selesai berulang.
- `0003_material_progress` membuat tabel dengan primary key gabungan siswa/materi. Update progres mengunci baris materi untuk menserialkan pembuatan pertama pada PostgreSQL.
- Library dan mutasi tetap memeriksa kelas aktif, keanggotaan, dan publikasi. Bookmark tidak memberikan akses tambahan. Riwayat penanda tetap disimpan ketika akses dicabut; akan kembali terlihat apabila materi yang sama dapat diakses lagi. Edit materi tidak otomatis mereset penanda selesai karena belum ada versioning materi.

## Uji dan batas verifikasi

- Tujuh skenario route backend lulus: lima sebelumnya ditambah privasi/reversibilitas progres dan penolakan akses progres. Menggunakan FastAPI asli dengan SQLite memori dan override identitas, bukan login JWT atau PostgreSQL nyata.
- Pengujian fixture siswa lulus: daftar, baca, simpan/batalkan selesai, bookmark, isolasi akses, validasi dan penolakan mutasi guru.
- Build Next.js beserta TypeScript, ESLint, dan Ruff lulus.
- Alembic offline berhasil menghasilkan SQL PostgreSQL sampai `0003_material_progress`; migrasi belum dieksekusi pada database aplikasi.
- Pengujian browser setelah login dan transaksi Server Actions belum diverifikasi dalam milestone ini. Keberhasilan build/route/fixture tidak menggantikan pengujian tersebut.

## Cara mencoba tanpa database

Ikuti bagian pengujian frontend di README. Mulai ulang fixture dan frontend yang diarahkan ke fixture, lalu login `siswa.test` dengan password lokal `fixture-only-123`. Data hanya disimpan dalam memori fixture dan akan reset saat dimulai ulang.

Skenario manual:

1. Dashboard menampilkan 0 dari 3 materi selesai; pustaka menampilkan 3 materi dari 2 kelas.
2. Cari “pecahan”, buka pembaca, ubah ukuran teks dan kontras. Coba seluruh kontrol dengan keyboard.
3. Tekan tanda selesai, batalkan dialog, pastikan status belum berubah. Ulangi dan konfirmasi; kembali ke dashboard, semestinya 1 dari 3 selesai.
4. Simpan bookmark; filter Bookmark menampilkan materi tersebut. Muat ulang halaman dan periksa status tetap ada selama fixture berjalan.
5. Batalkan tanda selesai dan hapus bookmark; pastikan filter/jumlah ikut berubah.
6. Cari kata yang tidak ada, periksa empty state dan Reset filter. Periksa tampilan ponsel dan pembaca layar.

Fixture guru baru mendukung baca kelas/materi, bukan pengelolaan kelas. Fixture bukan pengujian integrasi database atau AI.

## Berikutnya

- Verifikasi transaksi UI setelah login menggunakan lingkungan terisolasi, termasuk pembatalan dialog, error backend dan akses setelah dicabut.
- Eksekusi migrasi serta pengujian PostgreSQL pengembangan, termasuk update bersamaan.
- Pagination server untuk jumlah materi besar; saat ini seluruh metadata materi yang dapat diakses dimuat.
- Preferensi aksesibilitas lintas perangkat, profil siswa, versioning materi dan riwayat belajar.
- Tutor ChatGPT yang dibatasi materi kelas, latihan/kuis dan hasil, kemudian ElevenLabs TTS/STT.
