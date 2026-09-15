# Prototipe dashboard admin KODMOD

Status: UI/UX interaktif, belum implementasi Next.js atau integrasi API.

Sumber pratinjau: `output/ui-prototype/kodmod-admin.html`.
Mengikuti logo asli dan warna biru pada blueprint siswa/guru.

## Cakupan layar

1. Ringkasan: akun, kelas, aktivitas belajar, hal yang perlu ditindaklanjuti, dan kejadian terbaru.
2. Analytics: dua periode contoh, sesi tutor harian, penyelesaian kuis, dan partisipasi kelas. Rasio kuis tidak ditampilkan sebagai tingkat penguasaan.
3. Pengguna: cari/filter, detail, tambah, edit nama/peran, aktif/nonaktif, serta konfirmasi reset sandi dan hapus akun simulasi. Admin tidak dapat menonaktifkan, menghapus, atau menurunkan perannya sendiri.
4. Undangan: label, kuota, durasi berlaku, penggunaan, dan pencabutan dengan konfirmasi. Kode tidak mengatur role, memasukkan siswa ke kelas, atau membuat admin.
5. Kelas & materi: daftar, penanggung jawab, status kesiapan materi, detail kelas dan akun siswa. Peninjauan isi tetap tugas guru.
6. Log aktivitas: pencarian, kategori, detail kejadian, pelaku, target, hasil, serta perubahan lokal dari operasi pengguna/undangan/pengaturan.
7. AI & suara: rancangan status koneksi, metrik OpenAI dan ElevenLabs, serta detail kegagalan contoh. Tidak membaca kredensial atau memanggil API.
8. Pengaturan: identitas sekolah, preferensi bahasa, ukuran teks, dan ringkasan hak akses per peran.

Semua data contoh berada di memori halaman dan kembali ke awal saat dimuat ulang. Tombol Ponsel mengubah susunan navigasi; tabel menjadi daftar saat sempit. Tindakan yang mengubah data hanya berjalan di prototipe, termasuk publikasi log. Sandi contoh tidak disimpan.

## Kesesuaian backend yang diperiksa

`apps/ai-engine/api/routes/admin.py` menyediakan daftar/tambah/update/hapus pengguna serta daftar/buat/cabut undangan. `models/user.py` menetapkan username, full_name, role, is_active, informasi masuk, serta skema undangan. Perubahan peran dan status akun sendiri dibatasi backend.

Analytics admin, audit log terstruktur, pengaturan sekolah, pengelolaan kelas, dan pemantauan pemakaian penyedia perlu kontrak API tersendiri sebelum integrasi. Log prototipe bukan bukti bahwa audit log persisten sudah tersedia. Status provider selalu diberi label belum dihubungkan.

## Tahap penerapan berikutnya

- Layout admin Next.js dengan pemeriksaan role pada server dan API.
- Hubungkan manajemen pengguna dan undangan ke endpoint yang tersedia; tangani loading, kosong, validasi, konflik username, dan kegagalan jaringan.
- Tentukan pagination, rentang waktu, zona waktu, dan definisi metrik analytics.
- Tambahkan audit log server dengan ID kejadian, pelaku, waktu, target, perubahan, dan hasil; jangan simpan sandi/API key.
- Tentukan kontrak kelas/enrollment, status materi, pengaturan sekolah, dan observabilitas provider.
- Uji akses keyboard, pembaca layar, konfirmasi tindakan, dan pemulihan error sebelum rilis.

## Verifikasi prototipe

- Browser: tambah pengguna, pencarian, nonaktifkan dengan konfirmasi, lalu periksa dua kejadian terkait pada log.
- Browser: buat dan cabut kode undangan; ganti periode analytics dan verifikasi rasio berubah ke 75%; simpan nama sekolah.
- Browser: simpan pengguna dengan tombol Enter; validasi native menahan form kosong.
- Delapan menu pada viewport 320 px: lebar konten sama dengan lebar area tersedia, tanpa overflow horizontal.
- Pemeriksaan sintaks JavaScript lulus. Pemeriksaan ini tidak mencakup API atau aksesibilitas pembaca layar secara penuh.

Tidak ada commit/push pada tahap prototipe admin ini.
