# Integrasi ElevenLabs KODMOD

Tanggal diperbarui: 2026-09-23

Status: backend, proxy, pilihan suara browser, dan cache lokal tersedia; preset Bian sudah disamakan dengan tangkapan layar. Panggilan live tetap perlu API key backend.

## Yang sudah dikerjakan

- Adapter HTTP bersama di `apps/ai-engine/voice/elevenlabs.py`:
  - TTS batch dan streaming memakai `eleven_multilingual_v2` serta format `mp3_44100_128`.
  - Preset suara Bian (`1k39YpzqXZn52BgyLyGO`) berbahasa Indonesia: stability `0.5`, similarity `0.75`, speed `1.0`, style `0.0`, speaker boost `false`.
  - Language override tidak dikirim; Multilingual v2 mendeteksi bahasa dari teks dan voice.
  - STT batch memakai ElevenLabs Scribe `scribe_v2`.
  - error provider diringkas dan tidak mengembalikan body provider atau API key.
- Semua pilihan provider masuk `config/settings.py`; tidak ada key ElevenLabs di frontend.
- REST terautentikasi siswa:
  - `POST /voice/tts` mengembalikan bytes audio tanpa menyimpan artefak TTS sementara.
  - `POST /voice/stt` menerima multipart audio dengan batas ukuran.
  - `POST /voice/chat` melakukan transkripsi lalu satu turn graph.
  - `POST /voice/text` menjaga jalur keyboard sebagai fallback.
- WebSocket `/ws/voice` memakai kontrak `StreamingSTT` yang benar dan mengirim frame TTS sebagai binary.
- Next.js server proxy meneruskan sesi ke FastAPI di `/api/voice/tts` dan `/api/voice/stt`; secret tidak pernah masuk browser.
- Reader siswa memiliki kontrol manual Dengarkan, jeda/putar lagi, rekam, berhenti, dan review transkrip. Tidak ada autoplay atau pengiriman jawaban otomatis.
- Browser menampilkan pilihan suara pada kunjungan pertama. Suara KODMOD menjadi pilihan awal; suara bawaan perangkat tersedia di browser yang mendukung Web Speech API. Pilihan tersimpan di browser dan bisa diubah dari panel suara.
- Audio TTS server yang sama dipakai ulang dari IndexedDB, maksimal 50 audio/64 MB selama 30 hari. Cache berisi Blob audio dan hash teks; siswa dapat menghapusnya dengan konfirmasi.
- Versi kunci cache dinaikkan saat preset suara berubah agar audio yang dibuat dengan konfigurasi lama tidak digunakan kembali.
- Dashboard admin menampilkan apakah ElevenLabs sedang dipilih sebagai backend,
  apakah key/voice ID sudah lengkap, serta backend fallback yang aktif. Nilai
  ini boolean dan tidak pernah mengembalikan secret.
- Jika TTS atau STT gagal, kontrol suara menyebutkan bahwa jalur teks tetap
  tersedia. Siswa dapat mengulangi permintaan suara tanpa kehilangan draft.

## Konfigurasi lokal

Salin bagian voice dari `apps/ai-engine/.env.example` ke `.env` backend, lalu isi:

```dotenv
STT_BACKEND=elevenlabs
TTS_BACKEND=elevenlabs
ELEVENLABS_API_KEY=isi_di_backend_saja
ELEVENLABS_TTS_VOICE_ID=1k39YpzqXZn52BgyLyGO
ELEVENLABS_TTS_MODEL=eleven_multilingual_v2
ELEVENLABS_TTS_OUTPUT_FORMAT=mp3_44100_128
ELEVENLABS_TTS_STABILITY=0.5
ELEVENLABS_TTS_SIMILARITY_BOOST=0.75
ELEVENLABS_TTS_SPEED=1.0
ELEVENLABS_TTS_STYLE=0.0
ELEVENLABS_TTS_SPEAKER_BOOST=false
ELEVENLABS_STT_MODEL=scribe_v2
```

Default `TTS_BACKEND` pada kode dan `.env.example` kini `elevenlabs`, sesuai
pilihan browser “Suara KODMOD”. Server tetap memerlukan API key dan voice ID.
Untuk pengembangan tanpa akun, set `TTS_BACKEND=piper` secara eksplisit;
pilihan suara perangkat dan jalur teks juga tetap tersedia.

## Verifikasi yang sudah tersedia

- Unit provider memakai HTTP client palsu: request TTS, multipart Scribe,
  key kosong, dan redaksi error.
- Static wiring memastikan router voice terdaftar di FastAPI.
- `npm run lint --workspace @kodmod/web` dan
  `npm run typecheck --workspace @kodmod/web` lulus.
- Tes browser lokal pilihan/cache: `node --test tests/speech-preferences.test.mjs`
  (lima kasus helper). Ini belum membuktikan penyimpanan IndexedDB di perangkat
  nyata atau pemanggilan API ElevenLabs langsung.

## Release checklist sebelum pilot

1. Jalankan satu smoke test dengan key dan voice ID non-produksi, tanpa
   menyimpan key di repository, log, browser, atau screenshot. Uji TTS batch,
   STT multipart, dan `/ws/voice` bila streaming diaktifkan.
2. Uji perangkat NVDA/Windows dan TalkBack/Android: izin mikrofon, stop audio
   saat pindah halaman, pembacaan status, retry setelah HTTP 502/503, dan hasil
   transkripsi Bahasa Indonesia.
3. Tetapkan batas rate per siswa (TTS, STT, dan voice chat), batas karakter,
   timeout, dan retry policy. Retry hanya untuk kegagalan jaringan/5xx dan
   tidak boleh menggandakan pengiriman jawaban.
4. Tetapkan retensi audio dan transkrip. Audio sementara harus dihapus setelah
   dipakai; transcript yang masuk ke log belajar mengikuti kebijakan sekolah.
5. Catat metrik tanpa isi sensitif: provider, operation, status code, latency,
   karakter TTS, durasi audio STT, dan request id yang sudah direduksi. Jangan
   mencatat API key, audio bytes, atau body error provider.
6. Pantau pemakaian kredit dan biaya per operation dari dashboard provider atau
   metrik server. Fitur tetap menyediakan input teks saat saldo habis atau
   provider tidak tersedia.
7. Tambahkan fixture voice ke `apps/web/tests/api-fixture.mjs` bila alur browser
   terisolasi akan dijadikan gate CI.
