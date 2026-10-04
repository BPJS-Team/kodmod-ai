# Kuis guru dan penugasan kelas

## Batas fitur

Kuis pilihan ganda manual, 1–20 soal, penilaian bobot sama (0–100), satu percobaan per siswa per penugasan. Domain ini terpisah dari latihan adaptif `/quiz/*` dan belum menulis mastery Concept. Pembuatan soal AI, esai, dan pemetaan materi yang disetujui menyusul.

## Alur dan akses

1. Guru memilih Subject dan menulis soal, pilihan, kunci, narasi opsional, dan pembahasan.
2. Setiap simpan menghasilkan revisi baru. `expected_version` mencegah tab lama menimpa perubahan.
3. Guru boleh menunjuk guru aktif lain sebagai reviewer sebelum mengajukan. Tanpa reviewer, admin menangani antrean.
4. Reviewer/admin menilai revisi yang tepat. Pemilik tidak dapat menyetujui sendiri. Penolakan membutuhkan catatan; perbaikan membuat revisi baru.
5. Guru menerbitkan revisi yang disetujui dan menugaskannya ke kelas aktif miliknya.
6. Siswa yang masih terdaftar memulai/melanjutkan, menyimpan jawaban, lalu mengirim semua jawaban sekali. Nilai dan receipt disimpan sebelum respons sukses.
7. Guru melihat nilai anggota aktif kelasnya. Reviewer tidak mendapat akses nilai atau data kelas melalui kemampuan review.

Status revisi: `draft -> in_review -> approved -> published`, atau `in_review -> rejected`. Revisi lama tidak dihapus atau diedit saat membuat revisi baru. Subject, judul, soal, opsi, kunci, kebijakan nilai dan pembahasan merupakan snapshot revisi.

## Kontrak HTTP

Semua endpoint memerlukan Bearer JWT. UI menggunakan proxy Next.js `/api/editorial/...` dengan sesi HttpOnly, tanpa mengekspos JWT ke JavaScript browser. FastAPI `/openapi.json` adalah kontrak skema yang dapat diimpor ke Postman.

| Endpoint | Akses / perilaku |
| --- | --- |
| `GET/POST /teacher/quizzes` | Guru: daftar sendiri / buat (201) |
| `GET /quiz-reviewers` | Staff: hanya ID/nama guru aktif, maksimal 100 |
| `GET /quiz-reviews` | Admin: antrean review; guru: hanya yang ditunjuk |
| `GET/PATCH /teacher/quizzes/{id}` | Pemilik/reviewer/admin yang berhak membaca; hanya pemilik menyimpan revisi |
| `POST .../{id}/reviewer` | Pemilik saat draft; hanya admin untuk pergantian saat review |
| `POST .../{id}/submit-review` | Pemilik, draft saat ini |
| `POST .../{id}/approve` atau `/reject` | Admin/reviewer yang ditunjuk; bukan pemilik |
| `POST .../{id}/publish` | Pemilik, revisi saat ini yang disetujui |
| `POST .../{id}/assignments` | Pemilik, versi terbit, kelas aktif sendiri (201) |
| `GET /student/assignments` | Penugasan kelas yang masih bisa diakses siswa |
| `POST /student/assignments/{id}/start` | Buat percobaan (201) / lanjutkan (200) |
| `GET .../{id}/attempt` | Soal aman dan jawaban tersimpan, termasuk setelah tenggat untuk membaca |
| `PUT .../{id}/answers/{question_id}` | Simpan opsi valid dengan `expected_revision`; revisi bertambah |
| `POST .../{id}/submit` | Semua soal terjawab; `expected_revision` dan `Idempotency-Key` UUID wajib |
| `GET .../{id}/result` | Hasil siswa sendiri; pembahasan mengikuti kebijakan rilis |
| `GET /teacher/assignments/{id}/results` | Nilai anggota aktif kelas milik guru, bukan metrik latihan adaptif |
| `POST /teacher/assignments/{id}/close` | Pemilik menutup penugasan; hasil yang sudah diterima tetap tersedia |

Endpoint daftar menerima `limit` (1–100, default 25) dan `offset` (>=0). Keputusan review/publikasi membawa `version_id` dan `expected_review_revision`. Pergantian reviewer mencatat event dan menaikkan revisi review. Revisi lama, reviewer yang diganti, dan akun nonaktif ditolak.

Jadwal wajib menyertakan zona waktu, dinormalisasi UTC, dan `opens_at < due_at`. Batas pengumpulan saat penugasan harus berada di masa depan. Pembahasan `after_submission` langsung tersedia setelah submit; `after_due` memerlukan tenggat dan menahan kunci/pembahasan sampai tenggat. Tidak ada timer per soal.

Soal siswa hanya berisi `id`, `order_index`, `prompt`, `narration`, `options: [{id,label}]`, `concept_id`. Kunci dan pembahasan hanya ada pada DTO staff atau hasil yang sudah boleh dirilis.

## Konsistensi pengiriman

- Draft dikunci saat mutasi editorial; assignment lalu attempt dikunci saat start/autosave/submit/close.
- Constraint unik menjamin satu attempt per assignment/siswa dan satu jawaban per attempt/soal.
- Autosave dengan revisi lama menghasilkan 409; tidak diam-diam mengganti jawaban terbaru.
- Pengiriman akhir menyimpan kunci UUID, revisi payload, nilai, pembahasan snapshot, dan receipt JSON dalam transaksi yang sama.
- Kunci + payload yang sama mengembalikan receipt asli, termasuk setelah penugasan ditutup atau tenggat lewat. Payload berbeda dengan kunci sama menghasilkan 409.
- Pemeriksaan akun dan keanggotaan dilakukan sebelum replay. Siswa yang keluar dari kelas/kelas diarsipkan tidak dapat membuka receipt melalui akses lama.
- Respons gagal/terputus harus dicoba ulang dengan kunci dan revisi yang sama. Jawaban tidak dapat diubah selama hasil kirim belum pasti.

## Validasi lokal

`tests/editorial_test.py` menjalankan HTTP ASGI, autentikasi nyata, dan SQL SQLite terisolasi. `tests/contract/test_editorial_quiz_schemas.py` menguji batas input dan DTO. `tests/test_editorial_postgres.py` menguji row lock nyata, start/submit bersamaan, autosave melawan submit, dan pergantian reviewer melawan approval. Pengujian PostgreSQL menggunakan schema disposable di database khusus `kodmod_editorial_migration_test` pada port 5434, bukan database aplikasi.

Jalankan dari `apps/ai-engine` dengan venv proyek:

```powershell
python -m pytest tests/editorial_test.py tests/contract/test_editorial_quiz_schemas.py -q
$env:KODMOD_EDITORIAL_POSTGRES='1'
python -m pytest tests/test_editorial_postgres.py -q
```

Migration `0006_editorial_quizzes` berisi definisi tabel yang dibekukan. Upgrade, downgrade ke 0005, upgrade ulang, dan `alembic check` telah diverifikasi pada database terisolasi. Data aplikasi dan volume Docker dipertahankan.
