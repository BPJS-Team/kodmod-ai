# Handoff: registrasi, suara, dan bahasa KODMOD

Tanggal audit: 4 Oktober 2026. Dokumen ini adalah instruksi implementasi untuk AI berikutnya. Perubahan registrasi/suara/bahasa di bawah **belum diimplementasikan dalam milestone kuis**.

## Prompt yang bisa langsung diberikan ke AI

> Kerjakan langsung di C:\laragon\www\kodmod. Baca AGENTS.md, cek git status, lalu gunakan CodeGraph sebelum pencarian source jika .codegraph ada. Pertahankan perubahan yang sudah ada.
>
> 1. Hapus kewajiban kode undangan dari registrasi, dari UI sampai kontrak dan validasi backend. Siswa dan guru boleh mendaftar tanpa kode; admin tetap tidak boleh dipilih melalui registrasi publik. Hapus menu undangan yang sudah tidak digunakan.
> 2. Perbaiki ElevenLabs: suara KODMOD menjadi pilihan default menggunakan Bian dan eleven_multilingual_v2 dengan preset yang sudah tersimpan. Tambahkan tombol suara ON/OFF dan pengaturan suara di navbar semua ruang aplikasi.
> 3. Pisahkan suara pembaca menu dari suara belajar. Mematikan pembaca menu tidak mematikan suara otomatis jawaban Tutor. Sediakan replay/pause/stop, fallback perangkat dengan pemberitahuan yang jelas, dan cegah dua suara berjalan bersamaan.
> 4. Lengkapi pilihan Bahasa Indonesia/English, simpan preferensinya, terapkan pada UI, label aksesibilitas, suara perangkat, dan bahasa respons AI. Jangan mengubah global GRAPH_LANGUAGE per pengguna; bahasa harus mengikuti konteks pengguna/percakapan.
> 5. Lengkapi cache audio server yang persisten di volume Docker, selain cache browser yang sudah ada. Teks dan profil suara yang sama menggunakan audio yang sudah tersedia; permintaan bersamaan tidak memanggil provider berkali-kali. Tetap periksa akses sebelum memberikan audio materi privat.
>
> Gunakan tema biru/navy KODMOD, konfirmasi Swal2 bertema, dan komponen shadcn yang relevan dengan label/fokus keyboard yang benar. Pertahankan Next.js, OpenAI, LangChain, LangGraph, alur kuis guru dan adaptive quiz. Planner Agent belum diperlukan. Jangan mencetak API key atau menaruhnya di frontend. Jangan reset database atau volume Docker. Commit per progres menggunakan feat: ... huruf kecil, tanpa co-author/trailer. Validasi terisolasi sebelum memperbarui stack Docker lokal; jangan klaim pengujian perangkat nyata atau provider jika belum dilakukan.

## Kondisi yang benar-benar ditemukan

### Registrasi masih menggunakan undangan

- `apps/web/src/components/register-form.tsx`: input dan state `invitation_code`, termasuk teks konfirmasi.
- `apps/web/src/app/actions.ts`: action `register` mewajibkan kode dan meneruskannya ke API.
- `apps/web/src/components/login-form.tsx`: teks tautan daftar masih menyebut undangan; cari penggunaan lain sebelum menghapus.
- `apps/ai-engine/models/user.py`: `RegisterRequest.invitation_code` wajib, dengan validator.
- `apps/ai-engine/api/routes/auth.py`: registrasi mengunci dan memeriksa `InvitationCode`, lalu mengurangi kuota melalui penghitung penggunaan.
- Halaman/menu `/admin/undangan` dan `/admin/undangan/baru` serta invitation actions perlu dirapikan.

Hapus gate dan penggunaan kode pada alur registrasi. Pertahankan validasi username/password, keunikan akun, role yang diizinkan, rate limit yang ada, dan sesi HttpOnly. Tabel undangan lama boleh tetap sebagai data historis; jangan membuat migration DROP hanya untuk membersihkan UI. Perbarui tes auth/contract, fixture dan dokumentasi yang mengharuskan kode. Cari payload lain yang masih mengirim `invitation_code` agar tidak mematahkan kontrak.

### ElevenLabs terkonfigurasi, pembacaan belum otomatis

Pengecekan baca-saja pada konfigurasi container AI yang berjalan:

| Pemeriksaan | Hasil |
| --- | --- |
| Backend STT / TTS | `elevenlabs` / `elevenlabs` |
| Model TTS | `eleven_multilingual_v2` |
| Voice | `1k39YpzqXZn52BgyLyGO`, Bian - Neutral, Calm and Clear |
| Format | `mp3_44100_128` |
| Stability / similarity / style / speed | `0.5` / `0.75` / `0.0` / `1.0` |
| Speaker boost | `false` |
| GET subscription dengan key backend | HTTP 200 |
| GET configured voice | HTTP 200 |

Hasil ini membuktikan key diterima dan voice dapat diakses. **Belum membuktikan sintesis TTS, audio autoplay, mikrofon, atau pemutaran pada HP.** Jangan mengganti key/model sebagai dugaan perbaikan sebelum mengikuti alur request dan respons audio.

Penyebab/perbedaan perilaku yang ditemukan di source:

1. `VoicePreferencesProvider` default ke engine `app`, tetapi preferensi saat ini hanya engine app/device. Memilih engine default belum berarti pembaca menu aktif atau Tutor autoplay aktif.
2. `VoiceControls` memulai audio melalui tombol manual. `StudentTutor` juga meminta pengguna mendengarkan melalui kontrol suara, belum memutar jawaban baru otomatis.
3. `POST /voice/tts` memakai `require_student`. Guru/admin ditolak, dan tamu belum login tidak bisa membaca menu melalui endpoint ini.
4. Proxy web TTS menganggap 403 sebagai sesi berakhir. Akun guru yang sah dapat menerima pesan yang menyesatkan.
5. Tombol rekam memiliki kondisi disabled saat status recording, padahal tombol itu juga dipakai untuk menghentikan rekaman. Perbaiki agar Stop tetap tersedia saat recording; disabled saat transcribing boleh dipertahankan.
6. Permintaan audio yang selesai setelah Stop, perubahan teks, navigasi, atau unmount belum memiliki pengaman generasi request yang kuat. Jangan membiarkan audio lama tiba-tiba diputar.

File utama:

- `apps/web/src/components/voice-preferences-provider.tsx`
- `apps/web/src/components/voice-controls.tsx`
- `apps/web/src/components/student-tutor.tsx`
- `apps/web/src/app/api/voice/tts/route.ts`
- `apps/ai-engine/api/routes/voice.py`
- `apps/ai-engine/voice/tts.py`

### Kontrak suara yang dituju

- First-run setup: engine app/device, pembaca menu ON/OFF, preferensi low vision/guided navigation bila milestone aksesibilitas dikerjakan, bahasa ID/EN. Default engine app, menu narration ON, instructional audio ON. Pilihan tersimpan dan dapat diubah dari navbar.
- Jawaban Tutor baru dibacakan otomatis sekali sesudah respons final tersedia; membuka history atau render ulang tidak membacakan semua pesan lama.
- Gunakan satu koordinator output untuk menu, soal, materi dan Tutor: playback baru menghentikan output sebelumnya dan mengabaikan request lama. Cancel/Stop juga membatalkan generasi request yang belum selesai.
- Saat menu narration OFF, fokus/perpindahan menu tidak berbicara; Tutor tetap berbicara. Sediakan kontrol instructional audio tersendiri bila pengguna perlu menghentikannya.
- Pengguna screen reader perangkat bisa memilih pembaca menu aplikasi OFF agar tidak terjadi pembacaan ganda.
- Browser membatasi autoplay sebelum interaksi pengguna. Tombol first-run dapat menjadi langkah aktivasi audio; jika playback tetap ditolak, tampilkan tombol Aktifkan suara dan pertahankan teks serta replay. Jangan menjanjikan audio langsung terdengar tanpa interaksi pada semua browser.
- Tombol navbar memiliki label aksesibel, `aria-pressed` untuk toggle, fokus terlihat, dan bisa dijalankan dengan keyboard. Pengaturan tidak boleh bertumpuk dengan Swal atau memerangkap fokus.
- Pisahkan akses menu publik dan konten privat. Untuk sebelum login, gunakan audio menu yang sudah dibuat/disimpan atau endpoint dengan teks menu yang dibatasi. **Jangan membuka endpoint TTS bebas tanpa autentikasi** hanya untuk mengatasi layar login. Terapkan batas panjang, rate limit, dan batas biaya.
- Untuk guru/admin, izinkan TTS pada kebutuhan UI yang memang sah melalui dependency autentikasi yang sesuai; endpoint Tutor/chat siswa tetap mengikuti peran dan kepemilikan aslinya.

### Cache audio

Sudah ada IndexedDB, deduplikasi request browser, masa simpan 30 hari dan batas 50 item / 64 MB:

- `apps/web/src/lib/speech-audio-cache.ts`
- `apps/web/src/lib/speech-preferences.mjs`

Kunci cache sekarang terutama berdasarkan teks + versi cache, belum seluruh profil suara/bahasa dinamis. Backend `synthesise_bytes` masih memanggil provider; output file Tutor menggunakan nama unik. Belum ada cache TTS persisten lintas browser yang menyatukan request yang sama.

Target implementasi:

- Kunci hash dari teks yang dinormalisasi, bahasa, provider, model, voice ID, output format, speed, stability, similarity, style, speaker boost dan versi profil.
- Simpan audio dan metadata di direktori di bawah volume audio yang sudah dipasang Docker; tulis secara atomik dan jangan kembalikan file yang belum lengkap.
- Redis/distributed lock atau mekanisme setara untuk request sama lintas worker, dengan timeout/cleanup. Jangan simpan key API dalam metadata.
- Audio menu generik dapat dibagikan. Audio materi/jawaban privat tetap perlu otorisasi; URL yang dapat ditebak bukan kontrol akses. Jangan memasukkan audio privat ke asset publik hanya karena ingin cache.
- Invalidasi ketika profil/bahasa berubah. Batasi TTL/ukuran, siapkan pembersihan yang tidak menghapus file sedang dipakai, dan jangan cache respons error provider.

### Multilingual

`User.preferred_language` dan kontrak profil sudah mengenal `id`/`en`, tetapi `<html lang="id">`, banyak teks UI dan `SpeechSynthesisUtterance.lang = id-ID` masih tetap. `tools/llm_client.py:language_instruction` mengikuti global `GRAPH_LANGUAGE`; jangan menganggap toggle UI saja sudah membuat Tutor berbahasa Inggris.

File sasaran:

- `apps/web/src/app/layout.tsx`, layout auth/landing/guru/siswa/admin, komponen navbar.
- Tambahkan kamus dan helper terpusat; hindari conditional ID/EN di setiap komponen.
- Preferensi server cookie untuk HTML bahasa awal tanpa hydration mismatch, dan profil pengguna untuk akun login. Tentukan prioritas cookie/profil serta perilaku logout secara eksplisit.
- `apps/ai-engine/models/user.py`, kontrak profil, `graphs/state.py:build_learning_profile`, `api/chat_service.py:build_turn_state`, agent prompts, `tools/llm_client.py:language_instruction`.
- REST, voice chat, dan WebSocket harus memakai bahasa dari konteks autentikasi yang sama; uji dua pengguna ID/EN bersamaan agar bahasa tidak saling mengubah.
- Suara perangkat `id-ID`/`en-US`; ElevenLabs tetap Multilingual v2 dengan Bian. Selaraskan bahasa STT bila ada hint/override, menggunakan kontrak SDK/API yang benar.
- Terjemahkan navigasi, tombol, form, error, onboarding, konfirmasi, empty/loading state, alt text dan aria label. Tanggal/angka ikut locale. Materi yang ditulis guru tetap sebagai konten asli kecuali pengguna secara eksplisit meminta terjemahan.

## Urutan kerja dan acceptance checks

1. **Registrasi:** siswa/guru tanpa kode berhasil melalui UI dan API; role admin ditolak; duplikasi akun dan password salah tetap ditolak; kode bukan field required; menu undangan tidak lagi muncul.
2. **Voice dasar:** request TTS siswa/guru/admin sesuai akses; tamu mendapat menu terbatas; 401 dan 403 diberi pesan yang tepat. Uji satu sintesis Bian dengan teks dummy singkat dan key backend, laporkan status/konten audio tanpa key.
3. **Koordinator dan navbar:** default app/ON sesudah setup; toggle persisten; menu OFF + Tutor ON; Stop saat rekam bekerja; Stop/unmount membatalkan audio tertunda; autoplay ditolak memberi replay, tanpa spinner buntu.
4. **Cache:** dua request sama menghasilkan satu panggilan provider; request profil/bahasa berbeda tidak salah memakai audio lama; restart container masih cache hit; akun asing tidak bisa mengambil audio privat. Gunakan provider mock untuk pengujian biaya/deduplikasi.
5. **Bahasa:** ID/EN terlihat di semua ruang, `html.lang` dan suara perangkat sesuai, Tutor mengikuti bahasa tiap akun; dua pengguna berbeda tidak saling memengaruhi; cache memakai bahasa yang benar.
6. **Validasi:** lint/typecheck/build Next, tes auth/voice/language backend, tes HTTP melalui proxy Next, uji PostgreSQL terisolasi bila ada migration. Jalankan `npm run docker:up` lalu `node scripts/check-docker.mjs` tanpa menghapus volume. Catat terpisah pengujian fixture, provider nyata, browser desktop dan perangkat nyata.

Uji HP/assistive technology yang masih harus dilakukan: Android Chrome + TalkBack, iPhone Safari + VoiceOver, desktop NVDA, lebar 360–400px, zoom 200–400%, jaringan lambat, izin mikrofon ditolak, offline/restore dan autoplay ditolak. Pemeriksaan viewport desktop bukan bukti lulus TalkBack/VoiceOver.

## Milestone kuis yang harus dipertahankan

Kuis manual guru sekarang memakai tabel/revisi tersendiri, review guru lain/admin, publikasi immutable, penugasan kelas, progres jawaban siswa dan nilai final dengan receipt idempotent. Lihat [kontrak dan pengujian kuis](../editorial-quizzes.md) serta [rencana teknis](../superpowers/plans/2026-10-04-technical-priorities.md).

Pemetaan konsep/mastery penugasan, OCR yang direview, draft soal AI, dan pengujian perangkat nyata masih milestone berikutnya. Jangan menyebut fitur ini selesai hanya karena UI kuis manual sudah ada.
