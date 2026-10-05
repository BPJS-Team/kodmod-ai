# Materi kelas dan Tutor AI: kontrak dan rencana pelaksanaan

Tanggal: 4 Oktober 2026. Acuan: audit flow PDF halaman 6–10 dan persetujuan pengguna untuk mengerjakan fitur yang belum selesai. Planner Agent tetap ditunda.

## Temuan awal

- Guru sudah dapat membuat kelas, memasukkan nama mata pelajaran, menambahkan siswa, dan menerbitkan materi teks. Form impor hanya menerima TXT.
- Upload PDF pada API kurikulum belum terhubung dengan materi kelas yang digunakan frontend.
- Tutor belum memilih materi kelas; retrieval kurikulum belum membatasi akses berdasarkan keanggotaan kelas.
- Cabang mini-kuis Tutor menjalankan scoring pada invocation yang menghasilkan pertanyaan. State turn baru juga kehilangan konteks konsep.
- Pembaruan penguasaan konsep dapat menerapkan attempt lama lagi.
- Analitik dan transkrip guru masih menjangkau siswa di luar kelas guru.
- Kuis manual/generator yang ditinjau dan diterbitkan guru masih membutuhkan domain editorial yang terpisah dari latihan adaptif siswa.

## Tahap yang dikerjakan

### 1. Impor, peninjauan, dan indeks materi kelas

`POST /classes/{class_id}/materials/import` menerima multipart `file`: PDF berbasis teks, DOCX, TXT, atau Markdown, maksimum 25 MB. Hanya guru pemilik kelas aktif. Respons 200 berupa `{filename, title, content, warnings: string[]}`. Impor hanya menghasilkan pratinjau; tidak menyimpan, menerbitkan, atau memanggil embeddings.

`POST/PUT /classes/{class_id}/materials[/{material_id}]` mempertahankan kontrak judul, teks, dan publikasi serta menerima `source_filename` opsional. Materi memiliki `rag_status` (`pending`, `processing`, `ready`, `failed`), `rag_error`, `n_chunks`, `content_version`, dan `indexed_version`. Penyimpanan versi terbit menjadwalkan indeks di background. Hasil indeks lama tidak boleh menjadi konteks versi materi terbaru.

`POST /classes/{class_id}/materials/{material_id}/index` menjadwalkan ulang indeks untuk guru pemilik dan mengembalikan metadata materi dengan HTTP 202. Kesalahan provider tampil sebagai pesan aman. Draft tidak dapat dipakai Tutor siswa.

Chunks ditautkan ke `ClassMaterial` dan revisinya. Retrieval memeriksa kelas aktif, status terbit, versi indeks, serta keanggotaan siswa saat query. Pencarian kurikulum umum mengecualikan chunks kelas. Nama mata pelajaran kelas tetap digunakan sebagai label konteks; klasifikasi kurikulum `Subject`/`Concept` merupakan domain terpisah.

### 2. Tutor yang terikat materi

Chat menerima `class_id` dan `material_id` opsional; `material_id` wajib disertai `class_id`. Identitas siswa berasal dari sesi autentikasi. Backend menyimpan pilihan ini pada `LearningSession`, memeriksa akses pada setiap turn, dan mengembalikan `context: {class_id, material_id, subject_name, material_title} | null` pada respons/riwayat.

Materi yang belum selesai diindeks ditolak dengan 409. Materi tanpa izin atau ditarik kembali ditolak dengan 404. Penggantian konteks sesi yang sudah berjalan memerlukan sesi baru. Respons memiliki sumber dengan judul/nama berkas dan tautan materi; tidak menampilkan path filesystem internal. Nomor halaman belum dijanjikan karena guru dapat mengedit teks hasil impor.

Frontend memakai proxy Next.js yang membaca sesi HttpOnly. Editor menampilkan pratinjau, status pemrosesan, refresh, dan retry. Reader menyediakan tindakan menuju Tutor materi. Tutor menampilkan konteks serta sumber setiap jawaban. Konfirmasi/notifikasi mengikuti SweetAlert2 bertema aplikasi.

### 3. Percakapan dan penguasaan konsep

Pertanyaan mini-kuis dikirim melalui accessibility lalu graph selesai pada turn itu. Pending question dipertahankan dalam checkpoint; scoring menunggu jawaban pada turn berikutnya. History dan konteks tidak dihapus oleh state awal turn. Cursor attempt mencegah penerapan skor penguasaan yang sama dua kali.

### 4. Akses guru

Roster, analitik siswa, dan daftar sesi guru dibatasi pada siswa anggota kelas aktif milik guru. Sesi yang terikat materi kelas guru lain tidak boleh muncul dalam daftar atau dibaca melalui URL transkrip langsung. Admin agregat internal tidak menggunakan batas roster guru ini.

## Urutan validasi dan commit

1. Tulis reproduksi gagal untuk scoring sebelum jawaban, duplikasi mastery, impor dokumen, dan akses lintas guru.
2. Perbaiki graph; jalankan unit/contract yang menyentuh perubahan. Perubahan backend yang saling bergantung disimpan dalam satu commit milestone.
3. Implementasikan migrasi, import/index/access helper, retrieval, chat, dan UI bersama kontrak di atas.
4. Uji HTTP terhadap database SQLite terisolasi, retrieval dengan embeddings/provider diganti di batas I/O, serta fixture proxy frontend.
5. Jalankan lint, typecheck, build, dan suite frontend. Validasi migrasi SQL tanpa menerapkannya ke database pengguna.
6. Review diff untuk akses, versi data, error, dan konsistensi UI. Commit backend lalu frontend, tanpa trailer/co-author.

Hasil fixture/SQLite/simulasi graph dilaporkan terpisah dari PostgreSQL, browser perangkat, dan layanan AI nyata. Audit lingkungan saat awal tahap ini tidak menemukan Docker CLI maupun PostgreSQL lokal, sehingga pengujian Postgres/provider membutuhkan lingkungan tersebut kembali tersedia.

## Hasil pelaksanaan

Seluruh empat bagian tahap ini sudah diimplementasikan. Review integrasi menambahkan penyimpanan sumber pada metadata transkrip, judul sumber yang sesuai kontrak frontend, validasi konteks REST/WebSocket/voice, dan pemulihan indeks bagi materi lama maupun proses yang terhenti. Draft menampilkan petunjuk penerbitan, bukan status seolah-olah sedang diindeks.

Pengujian awal menemukan kegagalan nyata untuk scoring sebelum jawaban, replay mastery, akses lintas guru, jalur voice yang memakai ID sesi milik orang lain, sumber riwayat yang hilang, dan migrasi awal yang ikut membawa kolom masa depan. Semua reproduksi tersebut sudah diperbaiki. Assertions lama juga disesuaikan agar memeriksa `state.get("current_concept_id")` tanpa keliru melarang metadata `doc.get("concept_id")`.

Validasi lokal:

- Backend: 254 tes lulus melalui `python -m pytest -q tests/unit tests/contract tests/classroom_test.py`; SQLite dan provider palsu hanya pada batas I/O. Ruff seluruh file Python yang berubah lulus.
- Frontend: suite Node/HTTP 33 tes lulus terhadap Next.js di 3110 dan fixture API di 8119. Lint, typecheck, dan production build diverifikasi. Pemeriksaan Chrome memverifikasi editor materi, konteks/sumber Tutor, dan konfirmasi SweetAlert2.
- Alembic menghasilkan SQL sampai `0004`; tes memeriksa bahwa kolom konteks ditambahkan sesudah tabel kelas/materi dibuat. Ini belum membuktikan eksekusi pada PostgreSQL nyata.
- Compose root tidak lagi memasang `schema.sql` lama sebagai skrip bootstrap. Tidak ada migrasi yang diterapkan ke database pengguna, dan tidak ada panggilan OpenAI/ElevenLabs berbayar dalam pengujian tahap ini.

### Cara mencoba pada backend nyata

1. Hidupkan Docker Desktop, lalu `docker compose up -d postgres redis` dari root.
2. Aktifkan venv backend, pasang dependensi terbaru dengan `python -m pip install -e ".[dev]"`, lalu `python -m alembic upgrade head` dari `apps/ai-engine` pada database pengembangan yang dituju.
3. Isi konfigurasi model `LLM_*_MODEL`, OpenAI, dan ElevenLabs di `.env` backend. Jalankan backend dan `npm run dev:web`.
4. Sebagai guru: buka kelas → tambah materi → impor dokumen → tinjau teks → terbitkan → perbarui status sampai siap. Materi lama dapat memakai **Siapkan untuk Tutor**; proses terhenti dapat disiapkan ulang.
5. Sebagai siswa anggota kelas: buka materi → **Tanya Tutor tentang materi ini** → tanyakan isi → jawab cek pemahaman → buka ulang riwayat. Sumber dan pilihan materi harus tetap tampil.
6. Uji cabut keanggotaan/arsip kelas/tarik materi: turn berikutnya harus ditolak. Uji Bian TTS, Scribe, cache audio, dan perangkat HP secara terpisah.

Indeks berjalan melalui background task proses API, belum memakai antrean pekerjaan tahan restart. Retry tersedia, tetapi belum ada SLA atau klaim pemulihan otomatis. Dokumen baru juga belum dipetakan otomatis ke `Concept` kurikulum: Tutor/mini-kuis dapat bekerja dari teks materi, sedangkan penguasaan per konsep hanya diperbarui untuk ID konsep yang benar-benar terpetakan.

## Pekerjaan setelah tahap ini

1. Kuis guru: draft manual atau AI, review/edit, validasi, snapshot terbit, penugasan kelas, attempt siswa, serta hasil dashboard, mengikuti kontrak editorial 22 September.
2. Narasi pembelajaran bertahap dari materi, termasuk gambar/tabel; OCR untuk PDF scan dan metadata halaman sumber.
3. Rencana Belajar berbasis aturan setelah integrasi materi dan penilaian teruji; Planner Agent tetap tidak ditambahkan.
4. Streaming/cancel Tutor frontend, riwayat hasil yang lebih lengkap, serta uji NVDA/TalkBack dan mikrofon HP.
