<p align="center">
  <img src="assets/logo/Logo_horizontal_with_text.png" alt="KODMOD" width="420">
</p>

<p align="center">
  <strong>Asisten belajar AI buat siswa tunanetra.</strong><br>
  Dari sekadar dibacakan, jadi diajak mikir.
</p>

---

## Kenapa KODMOD dibuat

Di Indonesia ada sekitar 11 juta orang dengan gangguan penglihatan, dan 83% dari mereka sudah pernah merasakan sekolah formal. Jadi akses ke pendidikan sebenarnya bukan lagi tantangan terbesar.

Yang jadi tantangan justru apa yang mereka dapat setelah duduk di kelas. Baru sekitar 5% buku pelajaran yang hadir dalam format yang bisa mereka akses, dan 78% guru di sekolah inklusi belum pernah dapat pelatihan khusus untuk mengajar siswa disabilitas. Alat bantu yang ada sekarang, seperti screen reader JAWS atau NVDA, memang sudah cukup andal membacakan tulisan. Tapi sebatas itu saja, belum ada yang mengajak siswa untuk berpikir, bertanya balik, atau menyusun alasannya sendiri.

Jadi sebenarnya bukan soal kurangnya alat bantu, tapi belum adanya alat yang benar-benar bisa diajak berdiskusi.

Di situlah KODMOD hadir. Ia bekerja sebagai tutor percakapan yang mengikuti kurikulum SLB A, lebih peduli pada cara siswa berpikir ketimbang sekadar menguji hafalan, dan melaporkan progres belajarnya otomatis ke guru.

## Struktur folder

```
kodmod-ai/
├── apps/
│   ├── ai-engine/      Backend agentic (Python, FastAPI, LangGraph)
│   └── web/            Antarmuka (Next.js App Router, React 19, Tailwind v4)
├── docs/               Arsitektur, API, aksesibilitas, deployment
├── infra/docker/       Compose produksi, Caddy, Prometheus
├── assets/logo/        Aset merek
├── docker-compose.yml  Infrastruktur pengembangan lokal
└── Makefile            Kumpulan perintah sehari-hari
```

## Empat cluster agent

| Cluster | Isi | Tugasnya |
|---|---|---|
| Practices & Tutoring | Tutor Agent | Penjelasan gaya Socratic, berbasis RAG kurikulum |
| Quiz / Assessment | Scoring Agent, Quiz Analyzer | Menilai penalaran, menjelaskan di mana letak salahnya |
| Content & Exercise | Problem Generator | Bikin soal non-visual, tervalidasi guru |
| Analytics & Reporting | Learning Analytics Agent | Dasbor buat siswa dan guru |

Detail tiap cluster ada di [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Teknologi yang dipakai

| Lapisan | Pilihan |
|---|---|
| Orkestrasi | LangGraph + LangChain |
| LLM | Claude (bisa diganti ke OpenAI, Ollama, atau vLLM) |
| STT | ElevenLabs Scribe (`scribe_v2`) atau faster-whisper/Deepgram fallback |
| TTS | ElevenLabs (`eleven_multilingual_v2`) atau Piper/Azure fallback |
| Embedding | BGE-M3 (multilingual) |
| Basis data | PostgreSQL 16 + pgvector, Redis |
| API | FastAPI + WebSocket |
| Antarmuka | Next.js App Router, React 19, Tailwind v4, TypeScript |

## Cara menjalankan

```bash
make infra-up     # nyalain Postgres (pgvector) + Redis
make install      # pasang dependensi ai-engine dan web
make api          # jalanin ai-engine  -> http://localhost:8000
make web          # jalanin antarmuka  -> http://localhost:3100
```

Ketik `make help` buat lihat semua perintah yang tersedia.

### Frontend Next.js

Jalankan dari root proyek:

```bash
npm install
npm run dev:web
```

Buka `http://localhost:3100`. Untuk port lain: `npm run dev:web -- --port 3110`.
Salin `apps/web/.env.example` ke `apps/web/.env.local` jika alamat FastAPI perlu diubah.
`API_ORIGIN` dibaca pada server Next.js; default `http://127.0.0.1:8000`.

Fitur frontend saat ini:

- Landing page, login, pendaftaran dengan undangan, dan logout.
- Sesi cookie HttpOnly; role diverifikasi ke `/auth/me` pada halaman dan tindakan terproteksi.
- Admin: ringkasan akun/undangan, pencarian pengguna, tambah/edit akun, aktif/nonaktif, buat/salin/cabut undangan.
- Dashboard guru/siswa, kelas, keanggotaan, serta materi teks draft/terbit. Siswa memiliki pustaka materi, pencarian/filter, bookmark, penanda selesai, pengaturan ukuran teks dan kontras pembaca, serta ruang Tutor KODMOD dengan riwayat percakapan.
- Tutor REST sudah tersambung ke backend dan kontrol ElevenLabs di ruang siswa. Streaming WebSocket, kuis/tugas, analytics hasil belajar, dan layar audit log masih tahap berikutnya.
- Logo dan font disajikan lokal; tampilan menyesuaikan desktop maupun ponsel.

Login membutuhkan FastAPI serta akun yang sudah tersedia. Buat admin awal menggunakan panduan backend/script `apps/ai-engine/scripts/create_admin.py`; tidak ada akun demo bawaan pada frontend. Production harus menggunakan HTTPS karena cookie sesi menggunakan `Secure`. Logout menghapus sesi browser, tetapi backend belum menyediakan pencabutan token JWT individual.

### Pengujian frontend tanpa database sekolah

Fixture hanya untuk pengujian lokal dan tidak diimpor oleh aplikasi. Jalankan dua terminal PowerShell:

```powershell
# Terminal 1, dari root proyek
node apps/web/tests/api-fixture.mjs

# Terminal 2, dari root proyek
$env:API_ORIGIN='http://127.0.0.1:8109'
npm run dev:web -- --port 3110
```

Pada `http://127.0.0.1:3110/masuk`, akun fixture adalah `admin.test`, `guru.test`, atau `siswa.test`, dengan sandi fixture `fixture-only-123`. Data sementara kembali ke awal ketika fixture dimulai ulang. Jangan gunakan konfigurasi fixture untuk deployment.

Fixture siswa sudah menyediakan dua kelas, tiga materi contoh, dan kontrak Tutor REST sederhana. Login sebagai `siswa.test` untuk mencoba pustaka, filter, pembaca, bookmark, tanda selesai, dan `/siswa/tutor`. Jika fixture sudah berjalan saat kode diperbarui, hentikan lalu mulai ulang agar data/alur terbaru dimuat. Fixture mendukung tampilan kelas guru, tetapi mutasi pengelolaan kelas guru masih memerlukan backend nyata. Tidak ada panggilan AI atau suara berbayar dari fixture.

Backend nyata memerlukan migrasi sampai `0003_material_progress` (`python -m alembic upgrade head` dari `apps/ai-engine`, pada database pengembangan yang dituju). Detail status dan batas pengujian: [scope siswa](docs/plans/2026-09-16-student-learning.md).

```bash
node --test apps/web/tests/access.test.mjs
npm run lint --workspace @kodmod/web
npm run typecheck --workspace @kodmod/web
npm run build --workspace @kodmod/web
```

Tes akses memerlukan dua server fixture di atas. Verifikasi manual alur mutasi: tambah/edit/nonaktifkan pengguna, kode undangan buat/cabut, daftar memakai kode, filter pengguna, logout, dan akses lintas peran. Setelah pengujian, hentikan kedua terminal; terminal normal kembali menggunakan FastAPI sesuai `.env.local`.

## Aturan aksesibilitas

Empat hal ini adalah syarat produk, bukan sekadar preferensi gaya:

1. Setiap alur harus bisa diselesaikan **tanpa mouse**.
2. **Cincin fokus nggak boleh dihapus.**
3. Setiap informasi yang keluar lewat TTS harus punya **padanan di ARIA live region**.
4. **Nggak boleh ada dua suara sekaligus.** Pilih salah satu: mode pembaca layar atau mode percakapan, jangan dua-duanya jalan bareng.

Uji minimal sebelum merge: **NVDA (Windows)** dan **TalkBack (Android)**.

## Lisensi

Apache-2.0, lihat [`LICENSE`](LICENSE).
