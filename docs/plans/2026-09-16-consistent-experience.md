# Tema dan konfirmasi KODMOD

## Implementasi

Tema navy `#061329`, biru `#2565E9`, dan permukaan terang `#F3F7FC` diterapkan pada login, daftar, dashboard admin, pengguna, undangan, ruang awal siswa/guru, halaman error, dan komponen bersama. Login dan daftar memakai `AuthShell` yang sama. Form, tabel, kartu, badge, fokus keyboard, dan dialog mengikuti font aplikasi.

SweetAlert2 disediakan melalui `src/lib/dialogs.ts`. Gunakan `titleText` dan `text`, bukan HTML dari input pengguna. Konfirmasi memilih Batal sebagai fokus awal, mendukung Escape, mengunci fokus di modal, dan mengikuti preferensi reduced motion. Hasil tidak ditutup otomatis agar tersedia cukup waktu untuk dibaca.

## Cakupan aksi yang tersedia

| Aksi | Konfirmasi | Hasil |
| --- | --- | --- |
| Login | Ya, masuk | Notifikasi setelah redirect; kesalahan di dialog dan form |
| Daftar | Ya, buat akun | Notifikasi setelah redirect; kesalahan di dialog dan form |
| Logout admin/guru/siswa | Ya, keluar | Notifikasi setelah sesi dihapus |
| Buat/edit pengguna | Ya, buat pengguna / simpan | Notifikasi setelah redirect |
| Aktif/nonaktif pengguna | Ya, aktifkan / nonaktifkan | Notifikasi hasil dan keterangan pada form |
| Buat undangan | Ya, buat undangan | Notifikasi setelah redirect |
| Cabut undangan | Ya, cabut kode | Penjelasan dampak sebelum aksi dan notifikasi hasil |
| Salin kode | Ya, salin | Berhasil atau petunjuk salin manual |

Navigasi, pencarian, buka FAQ, tampilkan kata sandi, dan muat ulang tidak mengubah data sehingga tetap langsung. Otorisasi tetap dilakukan di server; dialog bukan pengganti pemeriksaan akses.

## Pola untuk fitur berikutnya

- Form yang memanggil Server Action: gunakan `useConfirmedAction`, `ActionFeedback`, dan tombol dengan status pending.
- Pertahankan validasi native sebelum submit. Jangan tampilkan kata sandi/token dalam ringkasan konfirmasi.
- Tombol logout: gunakan `LogoutButton`, jangan memanggil logout langsung dari form server.
- Pesan redirect memakai kode yang dipetakan ke teks tetap di `RedirectFeedback`; parameter dibuang dari URL setelah ditampilkan agar refresh tidak mengulang notifikasi. Parameter ini hanya presentasi, bukan bukti transaksi atau otorisasi.
- Jangan menambahkan konfirmasi native `window.confirm` atau style modal per halaman.
- Fitur tutor, materi, kuis, analytics lengkap, dan aktivitas yang belum terhubung tetap perlu implementasi tersendiri. Penyatuan tema ini tidak menyelesaikan fitur backend tersebut.

## Verifikasi

- Build produksi, TypeScript, dan lint lulus.
- Browser: login/daftar, dialog konfirmasi, Batal/Escape, fokus awal Batal, serta retensi nama/peran setelah batal.
- Fokus kembali ke tombol submit setelah pembatalan. Pratinjau notifikasi redirect tampil sekali dan tidak muncul lagi setelah refresh.
- Pemeriksaan mobile dilakukan pada 375 px dan 320 px.
- Pengujian mutasi admin dan keberhasilan autentikasi end-to-end belum dijalankan ulang: tool menolak perintah menjalankan server dengan alamat backend fixture sementara. Database aplikasi tidak dipakai sebagai pengganti fixture. Jalankan ulang `tests/access.test.mjs` dan alur browser dengan fixture sebelum rilis.
