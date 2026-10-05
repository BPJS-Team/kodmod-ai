# Statistik belajar dan verifikasi monitoring

## Hasil latihan dan tugas

Dashboard siswa dan ringkasan kelas guru menghitung jawaban latihan adaptif serta soal tugas formal yang sudah dikumpulkan. Jawaban tugas yang masih disimpan sebagai draft belum dihitung. Nilai tugas memakai snapshot penilaian yang tersimpan pada `AssignmentAttempt`, sehingga pengiriman ulang receipt tidak menambah hitungan.

| Field | Makna |
| --- | --- |
| `n_quiz_attempts` | Jumlah jawaban latihan dan soal tugas yang sudah dinilai |
| `n_practice_answers` | Jumlah jawaban latihan adaptif yang dinilai |
| `n_assignment_answers` | Jumlah soal pada tugas yang sudah dikumpulkan dan dinilai |
| `n_assignment_submissions` | Jumlah tugas yang sudah dikumpulkan dan dinilai |
| `quiz_accuracy` | Jawaban benar dibagi seluruh jawaban yang dinilai, pada skala 0–1 |
| `avg_quiz_score` | Rata-rata skor per jawaban pada skala 0–1 |

Contoh: dua jawaban benar dari tiga soal latihan, lalu satu jawaban benar dari lima soal tugas menghasilkan akurasi `3/8 = 37,5%`. Perhitungan memberi bobot yang sama pada setiap soal. Skor tugas pilihan ganda dihitung sebagai benar = 1 dan salah = 0.

Filter periode menggunakan waktu menjawab untuk latihan dan waktu pengumpulan untuk tugas. Tugas yang mulai dikerjakan pada periode lama tetap masuk ketika baru dikumpulkan pada periode yang dipilih. Penguasaan konsep tetap kumulatif.

## Bahasa

Ringkasan suara siswa memakai `preferred_language` akun siswa. Ringkasan detail siswa dan peringatan kelas memakai bahasa akun guru yang membacanya. Generator Indonesia/Inggris bekerja tanpa LLM. Jika pemolesan lewat LLM gagal, ringkasan tetap memakai bahasa yang dipilih.

Pilihan hari ini, tujuh hari, tiga puluh hari, dan semua waktu menghasilkan narasi periode yang sesuai. Penggantian bahasa memuat ulang ringkasan yang ditampilkan. Label waktu belajar, tingkat penguasaan, periode, serta label aksesibilitas progres tersedia dalam kedua bahasa. Nama konsep dan materi guru mempertahankan teks aslinya.

## Tampilan workspace

Halaman siswa, guru, dan admin memakai seluruh lebar ruang setelah sidebar. Grid kartu, statistik, serta formulir menyesuaikan lebar ruang yang tersedia. Tutor, editor kuis, dan penugasan berubah menjadi satu kolom saat ruang menyempit, termasuk ketika pengguna memperbesar teks. Paragraf penjelasan tetap dibatasi untuk menjaga kenyamanan membaca.

## Menjalankan verifikasi Docker

Dari root projek:

```powershell
npm run docker:up
node scripts/check-docker.mjs
node scripts/check-monitoring.mjs
```

`docker:up` membangun source terbaru dan menjalankan stack beserta monitoring. Script Windows mempertahankan data di Docker Centre dan membuat backup PostgreSQL sebelum pembaruan. Kedua checker melakukan pemeriksaan baca saja.

Checker monitoring memeriksa:

- Status container aplikasi dan monitoring.
- Readiness Prometheus, target scrape API/cAdvisor/Prometheus, serta evaluasi aturan alert.
- Data aktual dari query panel CPU, memori, dan jaringan container.
- Database Grafana, datasource Prometheus, koneksi datasource, dan dashboard yang diprovisikan.

Grafana lokal tersedia di `http://localhost:3001`. Kredensial administrator disimpan pada `.env` Docker Centre. Checker mengambil kredensial ke memori proses tanpa mencetak atau menuliskannya ke laporan.

Di Windows, tiga panel host Linux dicatat sebagai `SKIP` karena profil `monitoring-linux` belum aktif. Ketika deploy di VPS Linux, jalankan node-exporter seperti konfigurasi produksi; panel CPU host, memori host, dan disk root harus menghasilkan data juga. Verifikasi lokal belum membuktikan deployment VPS.

Nama Compose project default adalah `kodmod-centre` pada Windows dan `kodmod` pada Linux. Gunakan `KODMOD_COMPOSE_PROJECT` ketika nama project berbeda; `GRAFANA_BASE_URL` tersedia untuk mengubah alamat pemeriksaan Grafana.

Checker memilih container layanan Compose yang aktif. Container ad hoc untuk pengujian dan perintah Compose satu kali tidak ikut dipilih sebagai layanan utama. Jika satu layanan mempunyai beberapa replica, checker meminta pemeriksaan replica tersebut.

Hasil audit penguasaan konsep, perbaikan, bukti pengujian, dan batas validasi tersedia di [Validasi Student Model](STUDENT_MODEL_VALIDATION.md).
