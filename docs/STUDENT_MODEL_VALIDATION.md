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

Jalur latihan REST dan tugas formal memakai transaksi PostgreSQL serta kunci pada siswa yang sama. Receipt pengiriman dan event penguasaan menjaga pengiriman ulang dari pembaruan ganda. Perubahan penguasaan ikut dibatalkan jika transaksi gagal.

Implementasi utama berada di `api/assessment_service.py`, `api/assignment_mastery.py`, `analytics/student_model.py`, dan `agents/problem_generator.py` pada ai-engine.

## Bukti pengujian kode

Audit pada 5 Oktober 2026 menjalankan 73 tes Student Model tanpa kegagalan atau skip. Cakupan mencakup:

- Jawaban benar/salah, batas skor, jumlah percobaan, dan pemuatan ulang dari PostgreSQL.
- Dua penilaian bersamaan, pengiriman ulang, rollback, serta pemulihan receipt setelah aplikasi dimulai ulang.
- Pemetaan konsep dan versi review yang tetap melekat pada bukti historis.
- Tugas formal lalu latihan adaptif untuk siswa/konsep yang sama, melalui HTTP dengan autentikasi dan PostgreSQL terisolasi.
- Pengiriman ulang tidak menambah jumlah bukti; siswa lain tidak mendapat penguasaan siswa yang sedang diuji.
- Dashboard membaca hasil gabungan tugas dan latihan yang baru selesai.

Generasi dan scoring pada tes transaksi memakai provider deterministik. Tes node/graph menjalankan LangGraph dengan batas provider yang diganti stub. Kualitas penilaian jawaban bebas dari provider nyata dan kalibrasi pembelajaran belum dibuktikan oleh pengujian ini.

## Anomali yang masih terbuka

Ketiga temuan berikut dikonfirmasi melalui probe terisolasi. Semuanya dicatat untuk tahap perbaikan Student Model berikutnya.

| Prioritas | Temuan | Dampak dan contoh |
| --- | --- | --- |
| P2 | Pembacaan dashboard belum memakai pengurangan karena lama tidak latihan | Nilai tersimpan 80% setelah 30 hari tidak latihan dibaca Tutor sebagai 65%, tetapi dashboard menampilkan 80%. Perlu menyamakan definisi nilai yang ditampilkan dan dipakai untuk keputusan belajar. |
| P2 | Jalur Tutor lama menulis ulang penguasaan semua konsep setelah menerapkan pengurangan | Menjawab konsep B dapat menulis nilai konsep A yang sudah berkurang, tanpa memperbarui waktu latihan A. Saat dimuat lagi, A berkurang lagi: 65% menjadi 50%. Jalur REST latihan/tugas saat ini menulis konsep yang memiliki bukti; temuan ini berada pada jalur graph lama yang memanggil `StudentModel.persist()`. |
| P2 | Penyesuaian kesulitan deterministik materi kelas belum memakai target konsep yang disetujui | Probe dengan penguasaan 10% dan 90% sama-sama meminta kesulitan medium dan prediksi 0,50. Untuk konsep global, probe yang sama meminta easy/0,02 dan hard/0,98. Prompt materi kelas tetap membawa data penguasaan, sehingga perilaku provider nyata perlu diuji setelah aturan pemilihan target diperbaiki. |

Urutan perbaikan: samakan pembacaan penguasaan; batasi penulisan pada konsep yang memiliki bukti baru; gunakan konsep target yang disetujui pada penyesuaian kesulitan materi kelas. Tambahkan tes regresi untuk setiap temuan sebelum mengubah algoritma.

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
.venv\Scripts\python.exe -m pytest tests/integration/test_student_model_acceptance.py tests/integration/test_student_model.py tests/integration/test_assessment_transactions.py tests/unit/test_assignment_mastery.py tests/unit/test_bkt.py tests/unit/test_student_model.py tests/unit/test_mini_quiz_scope.py tests/unit/test_tutoring_turns.py tests/unit/test_material_concepts.py -q
```

Database pengujian harus disiapkan terpisah dari database aplikasi. Fixture transaksi memakai schema PostgreSQL privat dan membersihkannya setelah pengujian.
