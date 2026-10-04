# Validasi registrasi, suara, bahasa, dan UI

Tanggal: 4 Oktober 2026. Branch: `codex/assessment-foundation`. Provider: Bian / Eleven Multilingual v2, preset tetap. Data dan volume Docker utama dipertahankan.

| Pemeriksaan | Bukti |
|---|---|
| Backend terisolasi | 338 tes lulus: unit, auth/voice, kelas, assessment, editorial, kontrak kuis |
| Frontend tanpa server | 78 tes lulus: cookie, cache, koordinator, bahasa, dialog, progres dan fixture |
| Proxy Next dengan API fixture terpisah | 18 tes lulus: akses, materi/chat, kuis, suara semua peran dan bahasa |
| ESLint dan TypeScript | Lulus; build produksi Docker juga menjalankan TypeScript |
| Docker | `npm run docker:up` lulus; PostgreSQL, Redis, AI engine dan Next healthy; migrasi keluar 0 |
| Smoke HTTP Docker utama | 12 pemeriksaan lulus melalui `node scripts/check-docker.mjs` |
| Preview ElevenLabs nyata | HTTP 200, audio/mpeg, 135881 byte; dua respons identik, tetap identik setelah rebuild container |
| Origin bahasa Docker | POST dengan Origin publik localhost:3100 berhasil 200; cookie EN; SSR html.lang EN |

Kesamaan MP3 sesudah rebuild membuktikan audio masih tersedia. Jumlah panggilan provider nyata tidak diukur. Dedup satu panggilan, request lintas proses dan invalidasi profil/bahasa dibuktikan terpisah lewat tes mock.

## Review dan perbaikan

Review akhir menemukan Escape preview, antrean suara menu, notifikasi tertutup dialog, label dinamis English, kalimat kuis/scoring, dan fallback penyimpanan. Semua diperbaiki; kasus perilaku mendapat tes regresi. Escape serta fokus kembali ke navbar juga diperiksa sebelum pengguna mengambil alih pengujian browser.

Pemeriksaan browser sebelum instruksi terbaru: popup 360/390 px dengan tombol simpan terlihat, preview nyata berstatus membaca, ID/EN, formulir tanpa undangan, login/feedback, menu OFF dengan Tutor tetap otomatis membaca, dan preferensi OFF setelah reload. Pemeriksaan viewport desktop bukan bukti pengujian HP/assistive technology.

## Cara mengulang lewat kode

```powershell
# cwd: root proyek
npm run lint:web
npm run typecheck:web
npm run docker:up
node scripts/check-docker.mjs
```

API fixture harus berjalan sendiri (8119), Next uji di 3110 dengan API_ORIGIN ke fixture. Set WEB_TEST_ORIGIN dan API_FIXTURE_ORIGIN sebelum tes `access`, `material-proxy`, `quiz-proxy`, `voice-language-proxy`. Suite editorial memakai fixture PostgreSQL berbeda. Jangan mengarahkan suite fixture ke DB utama.

Backend: gunakan venv proyek dan jalankan `tests/unit`, `tests/auth_voice_test.py`, `tests/classroom_test.py`, `tests/assessment_test.py`, `tests/editorial_test.py`, `tests/contract/test_editorial_quiz_schemas.py`.

## Yang belum dibuktikan

Percakapan OpenAI nyata menyeluruh, impor empat PDF baru, OCR, pemetaan konsep, batch buku/subbab, mikrofon, perangkat TalkBack/VoiceOver/NVDA, dan VPS belum menjadi klaim selesai dalam catatan ini. Uji klik berikutnya dilakukan pengguna; agen melanjutkan lewat kode/API.
