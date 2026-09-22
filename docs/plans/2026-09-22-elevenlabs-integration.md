# Integrasi ElevenLabs KODMOD

Tanggal: 2026-09-22  
Status: backend dan UI siap diuji secara terisolasi; belum ada panggilan live tanpa key deployment.

## Yang sudah dikerjakan

- Adapter HTTP bersama di `apps/ai-engine/voice/elevenlabs.py`:
  - TTS batch dan streaming memakai `eleven_multilingual_v2` serta format `mp3_44100_128`.
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

## Konfigurasi lokal

Salin bagian voice dari `apps/ai-engine/.env.example` ke `.env` backend, lalu isi:

```dotenv
STT_BACKEND=elevenlabs
TTS_BACKEND=elevenlabs
ELEVENLABS_API_KEY=isi_di_backend_saja
ELEVENLABS_TTS_VOICE_ID=voice_id_dari_akun_elevenlabs
ELEVENLABS_TTS_MODEL=eleven_multilingual_v2
ELEVENLABS_STT_MODEL=scribe_v2
```

Untuk menjalankan UI tanpa akun ElevenLabs, biarkan backend memakai
`faster-whisper`/`piper`; tombol suara akan memberi pesan fallback dan teks
tetap dapat dipakai.

## Verifikasi yang sudah tersedia

- Unit provider memakai HTTP client palsu: request TTS, multipart Scribe,
  key kosong, dan redaksi error.
- Static wiring memastikan router voice terdaftar di FastAPI.
- `npm run lint --workspace @kodmod/web` dan
  `npm run typecheck --workspace @kodmod/web` lulus.

## Yang masih harus dilakukan sebelum pilot

1. Jalankan satu smoke test dengan key dan voice ID non-produksi, tanpa
   menyimpan key di repository atau browser.
2. Uji perangkat NVDA/Windows dan TalkBack/Android: izin mikrofon, stop audio
   saat pindah halaman, pembacaan status, dan hasil transkripsi Bahasa Indonesia.
3. Tetapkan retensi transkrip, rate limit per siswa, dan metrik biaya
   ElevenLabs sebelum membuka fitur untuk seluruh sekolah. Artefak audio graph
   lama tetap perlu kebijakan rotasi terpisah.
4. Tambahkan fixture voice ke `apps/web/tests/api-fixture.mjs` bila alur browser
   terisolasi akan dijadikan gate CI.
