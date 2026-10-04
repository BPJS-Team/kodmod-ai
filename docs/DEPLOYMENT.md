# Menjalankan KODMOD dengan Docker dan deploy ke VPS

## Runtime yang dipakai

Semua proses aplikasi berjalan dalam Docker: **Next.js web → FastAPI/LangGraph → PostgreSQL + pgvector dan Redis**. Service `migrate` menjalankan Alembic sekali sebelum API mulai. OpenAI dan ElevenLabs tetap layanan eksternal yang dipanggil oleh backend. Browser dan screen reader perangkat berjalan di perangkat pengguna.

Image default menggunakan OpenAI LLM/embedding dan ElevenLabs STT/TTS. Tidak membutuhkan CUDA, GPU, Whisper lokal, Qdrant, ataupun download model reranker. LangChain dan LangGraph tetap terpasang. Docker lokal menjalankan hasil build, sehingga perubahan source perlu rebuild; ini bukan server hot reload.

## Lokal Windows, Docker Centre yang sudah ada

Dari `C:\laragon\www\kodmod`, setelah Docker Desktop aktif:

```powershell
pwsh -NoProfile -File .\scripts\docker.ps1 up
pwsh -NoProfile -File .\scripts\docker.ps1 status
```

Alias dari root repository: `npm run docker:up`, `npm run docker:status`,
`npm run docker:logs`, dan `npm run docker:down`. Di Windows alias memakai
script Docker Centre yang sama, sehingga tidak membuat project/database duplikat.

Script memakai project `kodmod-centre` dan override di `F:\Docker_Centre\kodmod` jika konfigurasi tersebut menunjuk checkout ini. Data PostgreSQL, Redis, audio, dan unggahan tetap di direktori `data` Docker Centre. Script akan menolak checkout yang berbeda agar tidak memakai database proyek lain tanpa sengaja. `F:\Docker_Centre\kodmod\docker.ps1 up` juga memanggil script repository ini.

- Web: `http://localhost:3100`.
- API lokal: `http://127.0.0.1:8109`; probes `/live` dan `/ready`.
- PostgreSQL: `127.0.0.1:5433`; Redis: `127.0.0.1:6379`.
- Antarkontainer memakai `ai-engine:8000`, `postgres:5432`, dan `redis:6379`.
- Migrasi otomatis menuju Alembic `head` pada checkout yang dibangun. Tidak memakai `database/schema.sql` lama.
- `down` menghentikan stack dan mempertahankan data. Jangan menambahkan `-v` untuk database yang diperlukan.

Perintah lain: `build`, `backup`, `logs`, `migrate`, `infra` (hanya database/cache), dan `qdrant` (opsional). `api` menjadi alias `up` untuk kompatibilitas script lama.

`up`, `api`, dan `migrate` menunggu PostgreSQL sehat lalu membuat backup custom-format sebelum migrasi. Jika dump, validasi arsip, atau salinan gagal, pembaruan dibatalkan. Backup dan manifest SHA-256 berada di `F:\Docker_Centre\kodmod\backups` (atau `.runtime/backups` tanpa Docker Centre). Perintah `backup` hanya membuat backup; tidak mengubah schema atau isi database.

```powershell
pwsh -NoProfile -File .\scripts\docker.ps1 backup
```

Dump ini melindungi database. Audio dan original unggahan tetap membutuhkan backup volume terpisah. Arsip berisi data aplikasi; simpan di lokasi privat di luar Git.

Tanpa Docker Centre, dari root repository:

```bash
cp apps/ai-engine/.env.example apps/ai-engine/.env
# Isi konfigurasi backend dahulu.
docker compose up -d --build --wait
docker compose ps --all
```

Docker lokal membutuhkan `.env` backend. API key tidak dimasukkan ke image maupun web. Isi `OPENAI_API_KEY`, enam `LLM_*_MODEL`, `ELEVENLABS_API_KEY`, dan `JWT_SECRET` acak yang kuat. Pilih ID model yang tersedia pada akun OpenAI. Preset Bian, Multilingual v2, serta Scribe v2 sudah disediakan. Jangan mengganti `.env` lokal yang sudah berisi key dengan file contoh.

### Akun admin pertama

Tidak ada akun dummy bawaan pada database nyata. Jalankan interaktif, lalu buat pengguna/undangan melalui dashboard admin:

```powershell
npm run docker:admin
```

Perintah tersebut memakai username `admin` dan meminta password dua kali.
Untuk username berbeda, jalankan perintah lengkap berikut:

```powershell
# Docker Centre:
& "$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin\docker.exe" compose `
  --project-name kodmod-centre --env-file F:\Docker_Centre\kodmod\.env `
  -f docker-compose.yml -f F:\Docker_Centre\kodmod\compose.override.yaml `
  exec ai-engine python -m scripts.create_admin --username admin
```

Password diminta di terminal dan tidak ditulis pada command. Script ini juga mereset password jika username tersebut sudah merupakan admin; gunakan username yang dimaksud. Setelah itu buka `/masuk`.

### Akun demo opsional

Untuk pengujian lokal, jalankan dari PowerShell:

```powershell
pwsh -NoProfile -File F:\Docker_Centre\kodmod\docker.ps1 demo-users
```

Seeder membuat atau mereset password untuk `siswa.demo` (student), `guru.demo` (teacher), dan `admin.demo` (admin) menjadi `password`. Menjalankan ulang menjaga ketiga akun demo tetap bisa dipakai dengan kredensial yang sama. Seeder tidak mengubah pengguna lain, termasuk `baysatriow`. Password ini hanya untuk database pengujian lokal; jangan gunakan pada database produksi atau saat membagikan tunnel publik.

## VPS Linux

Konfigurasi utama: `infra/docker/docker-compose.prod.yml`. Entry lama `apps/ai-engine/docker/docker-compose.prod.yml` hanya meneruskan ke konfigurasi tersebut.

1. Pasang Docker Engine dan Compose plugin sesuai dokumentasi distro VPS, lalu clone repository ke direktori deploy.
2. Arahkan DNS domain ke IP VPS. Buka port TCP 80/443 dan port SSH yang dipakai. Jika ada AAAA, pastikan IPv6 benar-benar menuju VPS.
3. Dari root repository, salin `.env.example` ke `.env` serta contoh backend ke `apps/ai-engine/.env`. Jangan membawa kredensial demo/database lokal ke VPS.
4. Isi root `.env`: `APP_DOMAIN` (tanpa `https://`), `ACME_EMAIL`, dan `DB_PASSWORD` unik. Generate password berbentuk hex agar aman dipakai pada URL database. Backend membaca password database yang sama dari Compose override; root `.env` menjadi sumbernya.
5. Isi backend `.env`: `JWT_SECRET` acak minimal 32 byte, API key provider, dan enam ID model. Gunakan `STT_BACKEND=elevenlabs`, `TTS_BACKEND=elevenlabs`, serta `CHECKPOINTER=postgres`. Lindungi kedua file: `chmod 600 .env apps/ai-engine/.env`.
6. Validasi dan jalankan:

```bash
docker compose --env-file .env -f infra/docker/docker-compose.prod.yml config --quiet
docker compose --env-file .env -f infra/docker/docker-compose.prod.yml up -d --build --wait
docker compose --env-file .env -f infra/docker/docker-compose.prod.yml ps --all
docker compose --env-file .env -f infra/docker/docker-compose.prod.yml exec ai-engine python -m scripts.create_admin --username admin
```

Hanya Caddy yang membuka port host 80/443. Database, Redis, API, dan web memakai jaringan internal. Caddy mengurus sertifikat HTTPS, meneruskan halaman dan `/api/*` ke Next.js, serta `/ws/*` ke FastAPI. Cookie sesi pada VPS memakai `Secure`; override `SESSION_COOKIE_SECURE=false` hanya digunakan Docker lokal HTTP.

Image frontend memakai Next.js standalone dengan tracing monorepo. `API_ORIGIN=http://ai-engine:8000` sama saat build/runtime karena fallback rewrite dikompilasi saat build. Ganti alamat itu hanya dengan rebuild. Browser tetap memakai URL aplikasi `/api`; tidak memerlukan alamat container atau provider key.

Belum ada deploy VPS nyata pada tahap ini. Domain, DNS, TLS, backup/restore di mesin tujuan, serta kapasitas CPU/RAM perlu diverifikasi ketika VPS tersedia. Mulai dengan satu instance API; ukur memori, latency dan konkurensi sebelum menambah replika. Worker ingestion durable dan observabilitas lengkap masih scope berikutnya.

### Backup dan pembaruan

Simpan backup di luar VPS, termasuk database, volume `kodmod-audio`/`kodmod-uploads`, serta konfigurasi privat secara terpisah. Jangan menyimpan backup berisi data siswa dalam Git.

Contoh dump PostgreSQL dari root repository, dengan direktori backup yang sudah dibatasi aksesnya:

```bash
docker compose --env-file .env -f infra/docker/docker-compose.prod.yml exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > /secure-backup/kodmod.dump
```

Uji restore pada database terpisah sebelum mengandalkan backup. Untuk snapshot audio/unggahan yang konsisten, hentikan web/API sebentar sebelum menyalin volume. `docker compose down` mempertahankan named volumes; penghapusan volume menghapus data.

Sebelum update: backup, review migration, simpan commit/image tag sebelumnya, lalu `git pull --ff-only` dan jalankan `up -d --build --wait` dengan konfigurasi produksi yang sama. Gunakan `KODMOD_TAG` unik untuk menyimpan image rilis; default `vps` akan ditimpa build berikutnya. Jangan menjalankan migrasi downgrade otomatis sebagai rollback pada database siswa.

### Reranker lokal opsional

Jika dibutuhkan, set `INSTALL_RERANKER=true` dan `RAG_RERANK_ENABLED=true` pada env Compose, lalu rebuild API. Ini memasang PyTorch CPU dan sentence-transformers; pemakaian pertama mengunduh model dan meningkatkan kebutuhan disk/memori. Varian ini belum diuji build pada delivery Docker default. Untuk lingkungan Python native: `pip install -e ".[dev,reranker]"`. RAG tanpa reranker tetap memakai OpenAI embeddings dan pgvector similarity retrieval.

## Acceptance setelah stack sehat

Pemeriksaan HTTP dasar yang dapat diulang: `node scripts/check-docker.mjs`
dari root. Default memakai web 3100/API 8109; untuk host lain atur
`DOCKER_WEB_ORIGIN` dan `DOCKER_API_ORIGIN`. Script hanya membaca halaman,
aset, probes dan penolakan akses tanpa login, tanpa membuat akun atau memanggil provider.
Hasil delivery lokal: [validasi Docker](docker-validation-2026-10-04.md).

Healthcheck membuktikan proses/jaringan dasar, bukan kualitas tutoring. Lakukan login admin→buat guru/siswa→kelas→unggah materi teks→review/terbit→tunggu indeks ready→Tutor dengan sumber→kuis adaptif→riwayat/analitik. Uji Bian TTS, Scribe STT, izin mikrofon, cache suara, retry provider, serta satu suara aktif. Uji NVDA, TalkBack/VoiceOver, keyboard dan low vision pada perangkat nyata. PDF scan belum didukung OCR; kuis resmi guru beserta review/publikasi/penugasan belum tersedia.

Sumber konfigurasi: [Next.js standalone](https://nextjs.org/docs/app/api-reference/config/next-config-js/output), [Docker Compose startup order](https://docs.docker.com/compose/how-tos/startup-order/), [Compose production](https://docs.docker.com/compose/how-tos/production/).
