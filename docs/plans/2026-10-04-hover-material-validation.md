# Hover suara, materi nyata, dan audit progres

Melanjutkan handoff auth/voice/language. Pengguna melakukan pengujian klik sendiri; validasi agen menggunakan kode, HTTP/API, dan database pengujian terisolasi.

## Milestone

1. Hover membaca menu setelah jeda singkat, fokus keyboard tetap berfungsi. Perpindahan di dalam satu tombol tidak mengulang suara; keluar sebelum jeda membatalkan antrean. Menu tidak memotong Tutor, preview, atau rekaman.
2. Perubahan bahasa yang berhasil mengucapkan konfirmasi dalam bahasa tujuan. Pakai katalog terbatas dan cache audio bersama. Perubahan gagal/tidak berubah atau menu OFF tidak menghasilkan konfirmasi suara.
3. Uji empat PDF pengguna dengan extractor dan API aktual. Catat jumlah halaman, batas import, hasil review/save/publish/index/read/Tutor, serta pembatasan parser rumus/gambar. Buku besar perlu preview per bab/rentang yang dapat direview; modul kecil dapat menjadi satu materi.
4. Hitung ulang scope menggunakan daftar kemampuan dan denominator yang dapat diperiksa. Pisahkan implementasi teruji kode dari acceptance provider, perangkat, dan VPS.

## Batas

- Database utama dan materi pengguna tidak direset; berkas sumber tidak diubah atau dimasukkan ke Git.
- Test RAG dengan embedding simulasi membuktikan akses/revisi/alur, bukan kualitas provider nyata.
- Cache privat jawaban Tutor tetap per pengguna; katalog menu dapat dipakai bersama.
- Commit per milestone dengan `feat: ...`, tanpa trailer/co-author. Tidak push pada pekerjaan ini.
