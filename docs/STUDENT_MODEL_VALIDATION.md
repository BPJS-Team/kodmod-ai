# Validasi Student Model

Student Model menyimpan estimasi penguasaan per siswa dan konsep pada `mastery_scores`. Jawaban yang benar menaikkan estimasi, jawaban yang salah menurunkannya, dan jumlah bukti serta waktu latihan terakhir ikut tersimpan. Algoritma saat ini memakai pembaruan skor berbobot dan aturan penurunan karena lama tidak latihan. Parameter ini masih perlu dikalibrasi dengan data pembelajaran nyata.

## Jalur yang sudah terhubung

| Sumber | Perilaku |
| --- | --- |
| Latihan adaptif | Skor jawaban masuk ke penguasaan konsep saat soal selesai atau batas percobaan tercapai. Percobaan remediasi sebelumnya ikut diterapkan pada tahap tersebut. |
| Latihan dari materi kelas | Penguasaan diperbarui untuk konsep yang telah disetujui guru dan disimpan bersama versi materi/pemetaan yang dipakai soal. |
| Tugas formal | Jawaban dari versi kuis yang sudah direview memperbarui penguasaan ketika tugas dikumpulkan. Autosave jawaban belum menjadi nilai akhir. |
| Kuis tanpa pemetaan konsep | Nilai tetap tersimpan; penguasaan konsep belum diperbarui. Guru perlu menambahkan pemetaan agar bukti bisa diatribusikan dengan benar. |
| Generasi latihan konsep global | Penguasaan dan kepercayaan terhadap bukti digunakan untuk menyesuaikan permintaan kesulitan soal. |
| Generasi latihan materi kelas | Kesulitan memakai penguasaan konsep target dari pemetaan yang telah disetujui. Atribusi setiap soal tetap mengikuti konsep yang benar-benar diuji. |

Jalur latihan REST dan tugas formal memakai transaksi PostgreSQL serta kunci pada siswa yang sama. Receipt pengiriman dan event penguasaan menjaga pengiriman ulang dari pembaruan ganda. Perubahan penguasaan ikut dibatalkan jika transaksi gagal.

Implementasi utama berada di `api/assessment_service.py`, `api/assignment_mastery.py`, `analytics/student_model.py`, dan `agents/problem_generator.py` pada ai-engine.

## Pembacaan dan penyimpanan penguasaan

Nilai tersimpan adalah estimasi saat bukti jawaban terakhir diterapkan. Tutor, profil siswa, dashboard siswa/guru, dan daftar konsep lemah memakai proyeksi yang sama terhadap waktu saat ini: nilai terakhir dikurangi `0,005` per hari tanpa latihan, dengan batas 0–1. Contoh: nilai tersimpan 80% setelah 30 hari dibaca sebagai 65% pada seluruh jalur tersebut.

Membaca nilai, memuat ulang halaman, atau menyimpan model tanpa jawaban baru tidak menulis ulang bukti. Menjawab konsep B tidak mengubah nilai tersimpan, jumlah percobaan, ataupun waktu latihan konsep A. Saat A dijawab lagi, pembaruan dimulai dari proyeksi terkini dan waktu latihan A diperbarui. Pemanggilan pengurangan berulang pada model yang sama juga tidak mengurangi nilai dua kali.

Konsep lemah diurutkan setelah proyeksi, bukan sebelum pengurangan. Karena itu, konsep yang lama tidak dilatih dapat direkomendasikan untuk diulang walaupun nilai historisnya lebih tinggi.

## Pemilihan target latihan materi kelas

Generator hanya memilih dari konsep yang disetujui pada versi materi/pemetaan aktif. Target yang sudah dipilih dalam state dan masih disetujui mendapat prioritas, kemudian konsep utama yang ditinjau guru, lalu konsep terlemah dari daftar yang disetujui. Bukti yang belum tersedia memakai prior netral 0,5. Materi tanpa pemetaan tidak mengambil target dari penguasaan konsep global siswa.

Prediksi memakai penguasaan serta kepercayaan bukti target tersebut. Dari permintaan awal medium, penguasaan 10% dengan kepercayaan 1 meminta easy/prediksi 0,02; penguasaan 90% meminta hard/prediksi 0,98. Generator tidak mengalikan penguasaan semua konsep materi untuk menentukan satu tingkat kesulitan.

Target ini membantu penyesuaian kesulitan, sedangkan `concept_id` pada setiap soal tetap menunjukkan konsep yang benar-benar diuji. Sumber tetap dibatasi pada siswa, kelas, materi, dan versi indeks yang berhak diakses. API tetap mempertahankan pilihan latihan konsep global atau materi kelas; request yang mencampur kedua scope ditolak.

## Bukti pengujian kode

Audit sebelum perbaikan pada 5 Oktober 2026 menjalankan 73 tes Student Model tanpa kegagalan atau skip. Cakupan mencakup:

- Jawaban benar/salah, batas skor, jumlah percobaan, dan pemuatan ulang dari PostgreSQL.
- Dua penilaian bersamaan, pengiriman ulang, rollback, serta pemulihan receipt setelah aplikasi dimulai ulang.
- Pemetaan konsep dan versi review yang tetap melekat pada bukti historis.
- Tugas formal lalu latihan adaptif untuk siswa/konsep yang sama, melalui HTTP dengan autentikasi dan PostgreSQL terisolasi.
- Pengiriman ulang tidak menambah jumlah bukti; siswa lain tidak mendapat penguasaan siswa yang sedang diuji.
- Dashboard membaca hasil gabungan tugas dan latihan yang baru selesai.

Generasi dan scoring pada tes transaksi memakai provider deterministik. Tes node/graph menjalankan LangGraph dengan batas provider yang diganti stub. Kualitas penilaian jawaban bebas dari provider nyata dan kalibrasi pembelajaran belum dibuktikan oleh pengujian ini.

## Perbaikan temuan audit

Ketiga temuan audit sudah diperbaiki pada 5 Oktober 2026. Delapan belas kasus regresi baru mencakup ketiganya: tujuh kasus pembacaan/penyimpanan dan sebelas kasus adaptasi materi. Tes pembacaan memakai PostgreSQL terisolasi; tes adaptasi mencakup request HTTP, pemetaan, pemuatan penguasaan, dan penyimpanan sesi, dengan provider deterministik.

| Temuan sebelumnya | Perilaku setelah perbaikan | Bukti regresi |
| --- | --- | --- |
| Dashboard membaca nilai historis sementara Tutor memakai proyeksi | Tutor, profil, dashboard, dan urutan konsep lemah memakai fungsi proyeksi yang sama | `tests/integration/test_mastery_projection.py` |
| Penyimpanan jalur graph lama mengurangi konsep yang tidak dijawab lagi | `persist()` hanya menulis konsep dengan bukti jawaban baru; pembacaan berulang tetap stabil | `tests/integration/test_mastery_projection.py`, `tests/unit/test_mastery_projection.py` |
| Materi kelas selalu meminta medium/prediksi 0,50 | Konsep target yang disetujui menentukan prediksi dan permintaan kesulitan; atribusi serta batas sumber tetap terjaga | `tests/unit/test_material_adaptive_difficulty.py` |

Sebelum perbaikan, enam dari tujuh kasus pembacaan dan sembilan dari sebelas kasus adaptasi gagal karena perilaku yang diaudit. Sesudah perbaikan, seluruh delapan belas kasus lulus. Ini membuktikan kontrak kode; kualitas soal dan penilaian dari provider nyata serta kecocokan aturan penguasaan dengan hasil belajar tetap perlu diuji. Perbaikan mencegah pengurangan ganda berikutnya; nilai historis yang mungkin sudah ditulis jalur lama tidak direkalkulasi otomatis.

Verifikasi suite backend lengkap menghasilkan 1.132 lulus, 2 gagal, dan 20 skip. Dua kegagalan berasal dari gate format dua file lama dan versi Alembic pada database uji yang dibuat lewat `create_all`. Setelah penyiapan database uji dilengkapi dan tes PostgreSQL opt-in dijalankan, 17 pemeriksaan lanjutan lulus, termasuk kesesuaian Alembic, migrasi dengan data lama, pemetaan bersamaan, dan worker. Dua pemeriksaan build menggunakan image uji yang sudah tersedia sehingga dicatat skip. Angka suite lengkap dan pemeriksaan lanjutan saling beririsan, bukan jumlah tes yang dapat dijumlahkan. Gate format `api/routes/classrooms.py` dan `tests/classroom_test.py` tetap tertunda di luar perubahan Student Model.

## Menjalankan tes terisolasi di Windows

Dari `apps/ai-engine`, dengan PostgreSQL pengujian pada port 5434. Buat database khusus berikut sekali sebelum menjalankan tes:

```powershell
docker exec kodmod-postgres-test createdb -U kodmod kodmod_test_student_model
```

Kemudian siapkan schema/seed dan jalankan:

```powershell
$env:DB_NAME = 'kodmod_test_student_model'
$env:REDIS_DB = '5'
$env:KODMOD_EDITORIAL_POSTGRES = '1'
$env:ASSESSMENT_TEST_DATABASE_URL = 'postgresql+asyncpg://kodmod:kodmod@127.0.0.1:5434/kodmod_test'
.venv\Scripts\python.exe -m scripts.init_test_db
.venv\Scripts\python.exe -m pytest tests/integration/test_student_model_acceptance.py tests/integration/test_student_model.py tests/integration/test_assessment_transactions.py tests/integration/test_mastery_projection.py tests/unit/test_assignment_mastery.py tests/unit/test_bkt.py tests/unit/test_student_model.py tests/unit/test_mini_quiz_scope.py tests/unit/test_tutoring_turns.py tests/unit/test_material_concepts.py tests/unit/test_mastery_projection.py tests/unit/test_material_adaptive_difficulty.py -q
```

Database pengujian harus disiapkan terpisah dari database aplikasi. Fixture transaksi memakai schema PostgreSQL privat dan membersihkannya setelah pengujian.
