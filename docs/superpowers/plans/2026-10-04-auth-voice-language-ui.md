# Registrasi, suara, bahasa, dan penyempurnaan UI

## Brief

Pengguna meminta implementasi langsung handoff registrasi/suara/bahasa dan perapian UI. Tema tetap biru/navy dengan logo KODMOD, Plus Jakarta Sans untuk judul dan Source Sans 3 untuk bacaan. Copy berisi tugas pengguna, tanpa nama provider, konfigurasi key, kuota cache, label dekoratif, atau slogan yang tidak membantu navigasi. Preview suara tersedia sebelum login. Respons Tutor baru dibacakan otomatis, terpisah dari pembaca menu.

## Kontrak

- `POST /auth/register`: username, password, full_name, role student/teacher, optional preferred_language id/en. Undangan tidak diperlukan; admin ditolak. Sesi dan validasi akun dipertahankan.
- `POST /voice/tts`: akun aktif semua peran, text 1–5000 karakter, language id/en. Audio privat, no-store, tidak tersedia melalui URL file publik.
- `GET /voice/menu/{key}?language=id|en`: hanya katalog teks aplikasi yang ditentukan server, tanpa teks bebas. Preview, panduan awal, dan navigasi dapat diputar sebelum login.
- `POST /api/preferences/language`: id/en saja, cookie untuk render awal dan profil untuk akun masuk. Login memakai bahasa profil; logout mempertahankan bahasa perangkat. Kegagalan simpan profil diberitahukan.
- Cache server: audio di volume AUDIO_DIR, hash teks/profil/bahasa/scope, file atomik, kunci lintas proses, TTL 30 hari, batas 1 GiB. Cache privat terpisah per akun; tidak ada metadata teks/key.
- Koordinator suara tunggal: stop/pause/resume, pembatalan request tertunda, tidak memutar history otomatis. Menu OFF tidak mengubah Tutor ON. Autoplay ditolak menampilkan tombol dengarkan. Rekaman tidak dikirim sebagai jawaban tanpa tinjauan teks.
- UI bahasa memakai kamus terpusat, cookie SSR dan konteks klien. AI membaca bahasa dari profil pada state tiap permintaan tanpa mutasi global.

## Urutan implementasi

1. Tes registrasi tanpa kode, hapus gate frontend/backend serta navigasi undangan; commit progres.
2. Tes cache, izin suara, katalog publik, bahasa AI terisolasi; implementasi dan commit progres.
3. Fondasi bahasa dan preferensi, switch shadcn, koordinator suara, preview awal, navbar, autoplay Tutor; tes perilaku dan commit progres.
4. Rapikan landing/auth dan copy/navigasi ruang aplikasi, terjemahan UI, responsivitas; lint/typecheck/build, browser desktop dan commit progres.
5. Validasi terisolasi, satu sintesis provider singkat, rebuild Docker tanpa reset, smoke HTTP, review seluruh perubahan dan dokumentasi hasil.

## Review focus

Biaya endpoint publik harus terbatas; akses cache privat tetap diperiksa. Perubahan akun/bahasa tidak membacakan atau memakai audio akun lama. Stop dan navigasi membatalkan playback tertunda. Preferensi menu dan Tutor terpisah. Fokus dialog, label switch, keyboard, kontras, viewport 360–400px dan zoom tidak boleh rusak. Bahasa AI dua pengguna bersamaan harus tidak saling memengaruhi. Alur kuis dan data Docker dipertahankan.
