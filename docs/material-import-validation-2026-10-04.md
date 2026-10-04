# Impor empat PDF pengguna, 4 Oktober 2026

Pengujian dilakukan lewat kode/API; pengujian klik diserahkan kepada pengguna. Berkas sumber di `C:\laragon\www\kodmod\materi` tetap utuh dan tidak dimasukkan ke Git.

## Temuan dan perbaikan

Sebelumnya, tiga buku besar ditolak karena batas 150 halaman. Modul bangun datar dapat dibaca. Sekarang PDF hingga 500 halaman menyediakan pilihan bab/rentang bila tidak muat menjadi satu materi. Setiap materi tetap dibatasi 150 halaman dan 100.000 karakter; tidak ada pemotongan diam-diam.

Saran bab memakai bookmark PDF atau judul bab dalam teks. Guru meninjau judul/rentang sebelum menyimpan. Bila judul tidak terdeteksi, tersedia saran rentang 30 halaman dan pilihan manual. Nomor halaman adalah urutan PDF termasuk sampul, bukan nomor cetak pada buku.

| Berkas | Halaman PDF | Saran bab | Rentang diuji | Karakter | Potongan RAG |
| --- | ---: | ---: | --- | ---: | ---: |
| BIOLOGI KLS_X.pdf | 280 | 10 | 12–23 | 19.629 | 16 |
| MATEMATIKA-BS-KLS_X_Rev.pdf | 288 | 8 | 19–38 | 20.421 | 19 |
| Pendidikan-Pancasila-BS-KLS-X.pdf | 256 | 4 | 17–36 | 35.331 | 31 |
| modul_ajar_bangun_datar_SD.pdf | 37 | Satu modul | 1–37 | 17.141 | 13 |

Rentang Matematika dan Pancasila dipilih untuk pengujian, bukan klaim bahwa seluruh buku sudah ditinjau atau diterbitkan. Seluruh modul pendek diuji sebagai satu materi.

## Alur yang lulus

Untuk setiap dokumen: preview tanpa menyimpan → simpan draft → siswa belum dapat membaca → guru terbitkan → indeks versi saat ini → siswa anggota membaca teks → konteks Tutor terotorisasi → retrieval pgvector hanya materi terpilih. Guru lain tidak dapat mengimpor ke kelas tersebut; siswa luar tidak dapat membaca atau mengambil potongan RAG.

PostgreSQL/pgvector nyata berjalan pada port **5434**, database pengujian `kodmod_editorial_migration_test`, schema acak `material_validation_<uuid>`. Schema dihapus pada teardown. Database aplikasi port 5433 dan Redis utama tidak dipakai.

**Embedding pada tes ini disimulasikan.** Ini membuktikan parser, route, penyimpanan, publikasi, versi indeks, dan isolasi sumber. Belum membuktikan kualitas jawaban OpenAI terhadap setiap halaman. Tidak menjalankan browser.

## Menjalankan ulang

Dari `apps/ai-engine` dalam PowerShell, dengan container PostgreSQL pengujian aktif:

```powershell
$env:KODMOD_MATERIAL_TEST_DIR = 'C:\laragon\www\kodmod\materi'
$env:KODMOD_MATERIAL_TEST_REPORT = 'C:\laragon\www\kodmod\.runtime\auth-voice-ui\material-flow-report.json'
& 'D:\kodmod-ai-engine-venv\Scripts\python.exe' -m pytest tests/integration/test_supplied_materials.py -q -s
```

Tidak memilih folder berarti tes di-skip. Skip tidak dihitung sebagai lulus. Tes tidak memakai `clean_db`, fixture `db_engine` global, atau akun aplikasi utama.

## Cara pengguna mencoba

Masuk sebagai guru → Kelas → pilih/buat kelas dan mata pelajaran → tambah materi → unggah PDF → pilih bab atau halaman → baca halaman terpilih → tinjau teks/judul → simpan draft atau terbitkan. Siswa anggota membuka materi terbit lalu memilih **Tanya Tutor tentang materi ini** setelah status indeks siap.

Simpan bab sebagai materi tersendiri. Untuk subbab, gunakan rentang lebih kecil dan judul subbab yang sesuai. Saat ini saran bab belum menjadi hierarki buku/bab/subbab tersimpan atau pemetaan Concept/mastery yang direview. Potongan RAG membantu pencarian, bukan otomatis kurikulum belajar.

## Batas yang masih penting

- OCR PDF scan belum terhubung; scan tanpa teks masih ditolak dengan petunjuk OCR.
- Gambar, grafik, tabel dan rumus kompleks belum dijamin urutan atau narasinya. `fonttools` ditambahkan untuk membantu decoding font PDF, bukan mengganti OCR atau pembacaan diagram.
- Nama sumber mencatat rentang yang dipilih. Citation per halaman, original-file durable storage untuk import kelas, dan snapshot sumber historis belum tersedia.
- Bab sangat panjang mungkin perlu dipilih lebih kecil; subbab otomatis dan bulk create tetap pekerjaan lanjutan.
