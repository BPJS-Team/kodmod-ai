# Progres dan hasil pengujian KODMOD

Tanggal: 5 Oktober 2026. Dokumen ini memperbarui [review 4 Oktober](review-and-scope-2026-10-04.md) setelah paket implementasi dan pengujian gabungan selesai. Pemeriksaan dilakukan melalui kode, HTTP/WebSocket, database terisolasi dan container. Pengujian klik, tampilan pada perangkat dan screen reader tetap dilakukan pengguna.

## Ringkasan

Estimasi penyelesaian scope saat ini **91,3%**, naik dari 76% pada laporan sebelumnya. Metode tetap memakai 23 area berbobot sama: **19 tersedia dan 4 parsial**, dengan nilai tersedia=1, parsial=0,5, belum tersedia=0. Perhitungan: `(19 + 4 × 0,5) / 23 × 100`.

Angka ini menunjukkan cakupan fitur beserta acceptance yang relevan, bukan ukuran kualitas pedagogi, estimasi waktu tersisa atau persentase kesiapan produksi. Empat area parsial berada pada acceptance aksesibilitas/perangkat, visual, VPS dan alur nyata menyeluruh. Paket implementasi dalam [rencana penyelesaian](superpowers/plans/2026-10-04-scope-completion.md) sudah selesai untuk kode dan runtime lokal.

Docker lokal menjalankan Next.js, FastAPI/LangGraph, worker, PostgreSQL/pgvector dan Redis. Migrasi sudah mencapai `0011_provider_usage`. Seluruh layanan berjalan sehat; migrator selesai dengan exit 0. Empat akun, nol materi kelas dan satu sesi lama tetap ada setelah pembaruan. Materi dan akun pengujian dibuat pada database terisolasi, bukan database aplikasi.

## Mapping scope terbaru

| # | Area | Status | Hasil saat ini / sisa |
| --- | --- | --- | --- |
| 1 | Landing, brand, navigasi | Tersedia | Tema biru, informasi produk, placeholder gambar, aset dan navigasi; smoke HTTP dan aset lulus |
| 2 | Registrasi, login, role, logout | Tersedia | Siswa/guru tanpa kode undangan; session cookie dan pembatasan role; validasi username/nama/kelas; logout dengan konfirmasi |
| 3 | Kelas dan keanggotaan | Tersedia | Buat/edit/arsip kelas, roster dan akses berbasis enrollment |
| 4 | Materi guru | Tersedia | Upload, preview impor yang dapat dibuka lagi, editor/review, publikasi dan reindex |
| 5 | Buku dan modul | Tersedia | Saran bab, pilihan halaman, modul pendek langsung; empat PDF asli diuji lewat API/worker |
| 6 | Materi admin | Tersedia | Katalog/pencarian/pagination, isi dan original privat, edit/publikasi/reindex dan audit |
| 7 | Indeks dan RAG privat | Tersedia | Indeks versi isi/pemetaan, pgvector, batas akses setiap penggunaan, invalidasi dan antrean durable |
| 8 | Tutor terpandu | Tersedia | Pilih materi → pengajaran → tanya jawab → ulang/lanjut/kuis; state SQL dan restore; menjadi entry siswa |
| 9 | Mini kuis Tutor | Tersedia | Satu atau tiga soal dari bagian belajar; aksi pindah belajar ditahan selama kuis aktif; recovery dan replay jawaban |
| 10 | Asesmen mandiri | Tersedia | Sesi terpisah, pilihan materi/jumlah/tantangan, nilai/feedback, recovery dan idempotency |
| 11 | Penyusunan kuis guru | Tersedia | MCQ manual dan usulan AI dari sumber sah; usulan diperiksa/disimpan ke draft |
| 12 | Review dan publikasi kuis | Tersedia | Reviewer independen/admin, approve/reject, revisi dan versi terbit tetap; pemeriksaan capability saat overlap |
| 13 | Penugasan siswa | Tersedia | Jadwal, satu percobaan, autosave, resume, submit, hasil dan rilis pembahasan; hasil kelas guru |
| 14 | Concept dan StudentModel | Tersedia | Subject kanonis, pemetaan materi yang disetujui guru dan berversi; bukti mastery per soal tepat sekali |
| 15 | Dashboard, pengguna, analytics, audit | Tersedia | Admin/guru memakai data nyata; grafik, operasi akun, hasil penugasan dan log metadata persisten |
| 16 | Pemantauan AI | Tersedia | Token, karakter/audio, latensi, status/error, actor/session, pagination dan agregasi; estimasi biaya hanya bila harga dikonfigurasi |
| 17 | Suara dan cache | Tersedia | Bian Multilingual v2, Scribe v2, app/device choice, hover/focus, cache server/browser, suara menu terpisah dari suara Tutor |
| 18 | Indonesia/Inggris | Tersedia | Copy antarmuka, preferensi tersimpan, konfirmasi bahasa dan instruksi Tutor/soal sesuai bahasa; materi buatan guru mempertahankan bahasa sumber |
| 19 | Tunanetra dan low vision | Parsial | Preferensi teks/kontras/spacing/motion global, keyboard/focus dan navigasi geser opsional tersedia; NVDA/TalkBack/VoiceOver/reflow perangkat belum acceptance |
| 20 | Konsistensi shadcn/UI | Parsial | Input/Textarea/Select/Table/Dialog/menu bersama memakai tema aplikasi; keyboard/focus diuji kode; penilaian visual/responsif seluruh halaman masih oleh pengguna |
| 21 | OCR dan provenance | Tersedia | Original privat + SHA256, native/OCR per halaman, review guru, Linux Tesseract ind+eng, batas sumber daya dan leased worker |
| 22 | Docker dan VPS | Parsial | Stack lokal terbaru sehat, migrasi/backup/restore lulus; Compose produksi, Caddy dan tooling rilis tersedia; belum deployment/TLS/load acceptance di VPS |
| 23 | Acceptance nyata menyeluruh | Parsial | Provider asli, PDF asli, Linux OCR dan recovery diuji; alur lengkap memakai fixture provider, sehingga penilaian pedagogi lengkap serta perangkat/VPS masih terbuka |

## Bagaimana materi sampai ke siswa

1. Guru memilih kelas/mata pelajaran dan mengunggah dokumen. Original disimpan secara privat dengan hash file.
2. Buku panjang menawarkan bab/rentang halaman. Modul pendek dapat langsung menjadi satu materi. Preview dan hasil ekstraksi tersimpan, sehingga meninggalkan halaman tidak menghapus pekerjaan.
3. Halaman dibaca sebagai teks native atau OCR bila diperlukan. Guru meninjau teks, judul, rujukan halaman dan publikasi. Pemetaan Concept disetujui terpisah dan mempunyai versi.
4. Worker menyimpan potongan teks untuk pencarian pgvector. Versi indeks harus cocok dengan versi isi dan pemetaan. Siswa hanya memakai materi kelas yang diterbitkan, siap dan dapat diakses.
5. Tutor memakai teks yang sudah ditinjau. Heading Markdown, Bab/Chapter/Bagian/Subbab yang eksplisit dipertahankan sebagai batas bagian; bagian panjang dibagi sekitar 2.400 karakter tanpa membuang teks. Daftar bernomor tidak dianggap otomatis sebagai subbab. Guru masih perlu meninjau struktur hasil ekstraksi.
6. Tutor mengajar satu bagian, menerima pertanyaan dan menawarkan lanjut/ulang atau mini kuis. Ini alur belajar terpandu; chatbot lama menjadi jalur kompatibilitas.
7. Mini kuis Tutor, asesmen mandiri dan tugas guru mempunyai lifecycle terpisah. Jawaban/revisi/receipt disimpan di SQL dan tidak hilang ketika reload atau layanan restart. Nilai mengubah mastery global hanya jika soal mempunyai pemetaan Concept yang sah.

Dokumen menjadi sumber konteks belajar dan pembuatan soal melalui RAG; sistem tidak melatih ulang model OpenAI. LangChain/LangGraph tetap dipakai. Planner Agent tidak ditambahkan.

## Bukti pengujian

| Paket | Hasil | Batas bukti |
| --- | --- | --- |
| Unit, contract, static backend | **521 passed, 2 skipped** | Termasuk Ruff/format, mypy kode+tes, kontrak API, migrasi dan audit; dua skip adalah image test yang sudah dibangun dan lebih baru dari input |
| Integrasi backend | **114 passed, 3 skipped** | PostgreSQL/Redis nyata dan LLM fixture; dua checkpointer async dilewati pada Windows, satu PDF opt-in. Checkpointer Linux dan PDF asli diuji pada paket terpisah di bawah |
| Domain/konkurensi | **94 passed** | Assessment, auth/voice, kelas, editorial, pemetaan, guided dan antrean; schema/database disposable pada PostgreSQL 5434 |
| HTTP, WebSocket, E2E, security | **109 passed** | API terpisah pada database pengujian; mencakup auth, ownership, sesi dan source gate |
| OpenAPI fuzzing | **342 passed** | Seluruh 114 operasi, tiga kelompok dengan 10 contoh per operasi; bukan klaim audit keamanan menyeluruh |
| Frontend | **123 passed secara gabungan** | Run awal 121 passed/2 skipped; dua proxy editorial kemudian dijalankan dengan Next+backend PostgreSQL dan lulus. Tanpa klik browser |
| Typecheck/lint/build web | Lulus | Next production build Linux, `next typegen`/TypeScript dan ESLint |
| Linux runtime | **12 pemeriksaan lulus** | Registrasi, native/scan OCR, worker kehilangan lease lalu pulih, original privat, publikasi/index, guided, mini kuis/asesmen dan tugas formal |
| PDF pengguna | **4 dokumen lulus** | Tiga buku memakai rentang bab terpilih; modul SD seluruh 37 halaman. Rincian di tabel berikut |
| Provider asli | **9 pemeriksaan lulus** | GPT-6 Luna ID/EN, embedding, dua MCQ valid, rubric grading, Bian ID/EN, cache dan Scribe v2; probe terbatas, bukan evaluasi pedagogi besar |
| Docker utama | **13 smoke + 28 pemeriksaan role lulus** | Halaman admin/guru/siswa, proxy API, aset, redirect/auth, readiness dan route terbaru; pemeriksaan role tidak menambah materi/akun/sesi |
| Audio menu Docker utama | Lulus | Welcome Indonesia dan konfirmasi perubahan bahasa Inggris melalui Next; audio ulang identik. Empat request menghasilkan tiga `cache_hit` dan satu generasi nyata |
| Backup/restore | Lulus | Dump utama schema 0008 dipulihkan di database disposable; SHA256 cocok, empat pengguna terbaca; backup baru dibuat lagi sebelum upgrade 0009–0011 |

Jumlah hasil backend di lima kelompok pertama: **1.180 passed**. Pengujian fokus yang mengulang kasus yang sama tidak ditambahkan lagi ke jumlah tersebut. Warning deprecation/test configuration masih tercatat dalam log; tidak ada kegagalan yang disembunyikan sebagai lulus.

Perbaikan yang ditutup melalui pengujian:

- Respons rubric AI yang kosong/tidak valid kini gagal sebelum mengubah nilai/progres; retry tidak menghasilkan nilai palsu.
- Lock admin/guru memakai urutan classroom → material; overlap PostgreSQL tidak lagi membentuk siklus lock yang ditemukan saat review.
- Job selesai dengan indeks belum siap dapat diantrekan ulang. Worker yang kehabisan retry juga memperbarui status target yang masih sesuai versinya.
- Telemetry hanya mengabaikan event ID duplikat; error penyimpanan lain terhitung dan dicatat tanpa isi prompt/teks/kredensial.
- Username availability, registrasi dan profil menolak nilai yang tidak dapat disimpan, termasuk null character dan tingkat kelas di atas 50 karakter.
- Jalur STT file remote benar-benar menunggu fetch/transkripsi dan membersihkan file sementara.
- Autogeneration Alembic mengecualikan empat tabel checkpoint milik LangGraph; tidak mengusulkan penghapusan state tersimpan.
- API mengirim header `nosniff`, `DENY` dan `no-referrer`. Endpoint metrics tetap berada pada jaringan internal di Compose produksi.

Review kode terakhir tidak menyisakan temuan Critical/Important. Temuan Minor tentang target job yang tertinggal pada status processing sudah diperbaiki dan diuji pada PostgreSQL. Kualitas visual/perangkat dan VPS tidak dianggap sudah disahkan oleh review kode.

## Hasil empat PDF

| File | Halaman file | Bagian yang diimpor | Bab disarankan | Potongan indeks | Bagian belajar |
| --- | --- | --- | --- | --- | --- |
| BIOLOGI KLS_X.pdf | 280 | Halaman PDF 12–19 | 10 | 11 | 7 |
| MATEMATIKA-BS-KLS_X_Rev.pdf | 288 | Halaman PDF 19–26 | 8 | 7 | 4 |
| modul_ajar_bangun_datar_SD.pdf | 37 | Seluruh halaman 1–37 | Langsung modul | 13 | 9 |
| Pendidikan-Pancasila-BS-KLS-X.pdf | 256 | Halaman PDF 17–24 | 4 | 10 | 7 |

Seluruh halaman terpilih dari empat file mempunyai teks native. Scan OCR diverifikasi dengan PDF scan terpisah pada Linux Tesseract. Tidak mengklaim ketiga buku sudah diindeks seluruh babnya. PDF asli di folder `materi` tidak diubah dan tidak dimasukkan ke Git.

## Runtime, keamanan dependency dan bukti lokal

- Web aktif di **http://localhost:3100**, API lokal di `127.0.0.1:8109`. PostgreSQL utama 5433; PostgreSQL pengujian 5434. Persistensi aplikasi tetap di `F:\Docker_Centre\kodmod`.
- `pip-audit` lingkungan backend serta `npm audit --omit=dev` melaporkan **0 advisory runtime**. Safety yang redundan dihapus dari extra test setelah dependency transitifnya mempunyai advisory tanpa versi perbaikan; audit dependency tetap dijalankan dengan pip-audit.
- Audit npm penuh masih melaporkan lima temuan high pada rantai lint ESLint/braces. Tidak menurunkan versi major Next.js secara paksa. Ini sisa dependency tooling, bukan hasil audit runtime yang nol.
- Biaya pada admin hanya estimasi saat harga per model dikonfigurasi. Harga yang belum disetel ditampilkan tidak tersedia, bukan biaya nol.
- API key tetap di konfigurasi backend, tidak masuk image, Git, laporan atau browser. Provider receipts menyimpan metadata penggunaan, bukan prompt, teks jawaban atau audio.
- Backup sebelum upgrade terakhir: `F:\Docker_Centre\kodmod\backups\kodmod-20261005-055654-468e062c.dump`. Restore rehearsal memakai backup schema 0008 sebelumnya dan guard database terisolasi; tidak menimpa database utama.
- Log rinci, laporan JSON dan script acceptance sementara ada di `.runtime/scope-*` dan `.runtime/scope-proof/`, yang diabaikan Git. Ini bukti lokal, bukan artefak CI publik.

Panduan menjalankan dan deploy ada di [DEPLOYMENT.md](DEPLOYMENT.md). Docker lokal menjalankan hasil build; source baru perlu `npm run docker:up` untuk rebuild. Jangan menjalankan reset database testing terhadap port/database utama.

## Yang masih harus diterima pengguna

1. **Perangkat dan suara:** NVDA Windows, TalkBack Android, VoiceOver iPhone; suara awal setelah izin/gesture browser, hover/focus, bahasa, microphone, kontrol stop dan kemungkinan double speech dengan screen reader perangkat.
2. **Visual/reflow:** semua halaman utama, teks diperbesar, contrast/spacing/motion, viewport 320px dan zoom 400%. Periksa konten/tombol tetap terbaca, bisa dijangkau dan tidak tertutup.
3. **Pedagogi:** guru memeriksa penjelasan dan soal beberapa bab nyata, bahasa, OCR gambar/tabel/rumus serta feedback. Sembilan probe provider tidak menggantikan evaluasi ini.
4. **VPS:** domain/DNS/TLS, secrets produksi, backup original/audio bersama database, restore di mesin tujuan, monitoring dan pengukuran kapasitas/load.

Batas produk yang tetap diketahui: tugas formal mendukung MCQ, bukan esai; katalog guru masih dibatasi 200 item; materi dibatasi 25 MB, 500 halaman PDF untuk preview, 150 halaman/100.000 karakter per materi; struktur kurikulum hasil ekstraksi belum merupakan hierarki semantik yang disahkan otomatis. Revokasi JWT individual/session setelah reset password bukan fitur tambahan yang diselesaikan dalam paket ini. Menonaktifkan akun tetap diperiksa oleh backend.

Seluruh menu tidak dipanaskan sekaligus ke provider. Cache dibentuk ketika audio dipakai dan digunakan bersama pada scope menu publik; CLI warmup tersedia bila tim ingin menyiapkan katalog lebih dulu. Suara pengajaran tetap aktif terpisah dari sakelar pembaca menu aplikasi.
