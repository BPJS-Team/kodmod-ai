# KODMOD: Rencana UI/UX Landing Page, Siswa, dan Guru

Tanggal: 15 September 2026.
Status: draf desain untuk review; belum menjadi implementasi UI.
Baseline kode: `666eea8` - `feat: initialize nextjs frontend with accessible app shell`, sudah di-push ke `origin/main`.

## 1. Tujuan dan batas pekerjaan

Membentuk satu pengalaman KODMOD yang konsisten: pengunjung memahami manfaatnya, siswa bisa belajar secara mandiri lewat teks/suara, dan guru menyiapkan materi serta memantau pemahaman siswa.

Keputusan pengguna yang menjadi acuan:

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS v4.
- AI: OpenAI API untuk keluarga model GPT, yang disebut pengguna sebagai ChatGPT API. Nama model dipilih pada tahap integrasi berdasarkan evaluasi Bahasa Indonesia dan biaya.
- TTS: ElevenLabs. Antarmuka memakai istilah "Suara KODMOD".
- Warna utama mengikuti logo biru KODMOD yang sudah tersedia.
- Tahap berikutnya berfokus pada UI/UX dan prototipe interaktif.

STT tetap merupakan komponen tersendiri. Rencana awal mengusulkan layanan transkripsi OpenAI agar penyedia AI tetap konsisten; ini usulan, bukan keputusan pengguna yang sudah final. TTS ElevenLabs tidak otomatis menggantikan fungsi STT. FastAPI, LangGraph, PostgreSQL/pgvector, dan Redis tetap menjadi fondasi backend. Menggunakan satu penyedia LLM tidak menghapus pembagian peran tutor, penilaian, pembuat soal, dan analitik.

Fitur akun, kelas, kuis, suara, dan AI pada prototipe memakai data contoh dan keadaan yang disimulasikan. Integrasi layanan nyata dikerjakan setelah review desain. Jangan menampilkan keberhasilan unggah/publikasi palsu sebagai transaksi produksi. Tampilkan penanda "Pratinjau dengan data contoh" pada prototipe.

## 2. Sumber yang sudah ditinjau

### PDF: `archive/hackathon ai agent.pdf`

Seluruh 12 halaman dibaca sebagai bahan referensi. Diagram diperiksa secara visual, termasuk pembesaran halaman 9 dan 10. Catatan jadwal tim pada halaman 11 adalah isi referensi, bukan instruksi untuk membuat jadwal atau menghubungi pihak lain.

| Halaman | Isi yang relevan | Implikasi UI/UX |
| --- | --- | --- |
| 1-5 | Pendidikan inklusif, pengguna tunanetra, kebutuhan pendamping berpikir | Bahasa menghormati kemandirian siswa; belajar tidak bergantung pada visual |
| 6-8 | Tutor, kuis/penilaian, pengelolaan konten, analitik | Empat kemampuan produk, diterjemahkan menjadi tugas yang mudah dimengerti |
| 9 | Speech-STT-tutor-TTS, mini-kuis, scoring, student model, laporan | Ruang belajar, status suara, bantuan setelah jawaban, hasil dan progres |
| 10 | Guru membuat kelas/materi/penugasan; kuis manual/AI; validasi guru; perjalanan siswa | Acuan utama navigasi dan urutan layar; Planner Agent ditandai dihapus |
| 12 | React/Vite, beberapa penyedia AI, Coqui TTS | Diganti sesuai permintaan pengguna menjadi Next.js, OpenAI API, ElevenLabs |

Angka statistik dan sumber sekunder pada presentasi belum diverifikasi secara independen. Landing page awal tidak menggunakan angka tersebut sebagai klaim publik. Tidak mengarang testimoni, logo sekolah mitra, atau jumlah pengguna.

### Referensi guru: `archive/HEKETON AGENT AI/`

Seluruh 10 PNG ditinjau:

| Referensi | Dipertahankan | Disempurnakan |
| --- | --- | --- |
| `Login.png` | Form masuk yang fokus | Logo asli; konsisten KODMOD; username sesuai backend, bukan email; peran hasil autentikasi |
| `Dashboard.png` | Ringkasan, kelas, aktivitas, akses cepat | Prioritas "Perlu ditinjau"; warna biru; nama agent diganti status tugas |
| `Generate Kelas.png` | Pembuatan kelas bertahap | Review sebelum simpan; error per field; kembali tanpa kehilangan isian |
| `Generate Quiz.png` | Pilihan manual atau bantuan AI | Label "Tulis soal sendiri" dan "Buat dari materi" |
| `Generate Quiz - Otomatis.png` | Pilih sumber, jumlah, kesulitan, tipe soal | Hanya materi siap pakai; kemajuan proses dan retry yang jelas |
| Tiga `Generate Quiz - Manual (...)` | Pilihan ganda, esai, benar/salah | Label persisten, kunci jawaban/rubrik, instruksi khusus tiap tipe |
| `Generate Quiz -Validasi Soal (HASIL AKHIR).png` | Setuju, tolak, edit, publikasi | Status teks; pratinjau siswa; hanya versi disetujui yang dapat dipublikasikan |
| `Analitik.png` | Filter, distribusi, tren, progres siswa | Ringkasan yang bisa ditindaklanjuti; tabel alternatif untuk grafik |

Masalah spesifik yang tidak dibawa ke desain baru:

- Campuran merek EduAI/KodMod menjadi KODMOD.
- Input tidak mengandalkan placeholder sebagai satu-satunya label.
- Instruksi memilih jawaban benar pada pilihan ganda tidak ditampilkan pada esai/benar-salah.
- Esai guru membutuhkan pertanyaan, contoh jawaban/rubrik, dan bobot; bukan kolom "jawaban siswa" pada editor guru.
- "Agent aktif" tidak tampil sebagai deretan label teknis di setiap halaman. Status yang relevan misalnya "Materi sedang diproses" atau "3 soal perlu ditinjau".
- Perbedaan isian singkat di generator dan pilihan tipe pada editor perlu disatukan. Cakupan prototipe: pilihan ganda, esai, benar/salah; isian singkat ditunda.

### Logo: `assets/logo/`

- `Logo_horizontal_with_text.png`: 1564 x 452, untuk header dan halaman masuk.
- `Logo_only_no_text.png`: 428 x 452, untuk ikon aplikasi dan ruang sempit.
- Bentuk buku terbuka, jalur melengkung, titik, dan bintang memberi identitas yang dapat dipakai pada ilustrasi hero.
- Sampel piksel logo memuat navy `#103C80`. Biru lain berupa gradasi; token UI di bawah adalah adaptasi desain, bukan klaim semua kode warna identik dengan piksel logo.
- Pertahankan rasio asli; jangan membentangkan ikon menjadi persegi atau mengubah warna wordmark. Letakkan logo asli pada bidang terang agar terbaca.

## 3. Alur produk yang direncanakan

### Guru

```text
Masuk -> Dashboard -> Buat/pilih kelas
                         |-> Atur siswa
                         |-> Unggah materi -> Diproses -> Siap / Gagal + coba lagi
                         |-> Buat kuis
                                |-> Tulis sendiri -> Review
                                |-> Buat dari materi -> Validasi guru
                                         -> Publikasi ke kelas
                                         -> Siswa mengerjakan
                                         -> Analitik -> Tindak lanjut belajar
```

Draft, menunggu validasi, disetujui, ditolak, dan dipublikasikan adalah keadaan yang berbeda. Mengedit soal yang disetujui mengembalikannya ke keadaan perlu ditinjau. Publikasi meminta konfirmasi kelas tujuan dan jumlah soal. Versi yang diterbitkan tidak berubah diam-diam saat draft berikutnya diedit.

### Siswa

```text
Masuk -> Pilih cara mendengarkan -> Beranda
                                     |-> Lanjut belajar -> Tutor -> Mini-kuis
                                     |                       -> Bantuan / Penguatan
                                     |-> Kuis dari guru -> Jawab -> Review -> Hasil
                                     |-> Progres -> Ringkasan -> Rekomendasi belajar
```

Mini-kuis adalah pemeriksaan pemahaman dalam sesi tutor. Kuis dari guru merupakan penilaian yang ditugaskan dan sudah divalidasi. Keduanya tidak memakai istilah atau status yang membingungkan. Latihan mandiri adaptif backend tidak otomatis disamakan dengan kuis yang dipublikasikan guru.

Asumsi konten awal: jenjang menengah/SLB A, karena referensi memakai kelas 10-12. Bahasa tetap sederhana tanpa tampilan yang kekanak-kanakan. Target ini dapat disesuaikan sebelum desain rinci.

## 4. Arah visual: buku terbuka, ruang belajar yang tenang

Satu elemen khas pada landing page: bidang berbentuk dua halaman buku, dengan percakapan tutor di satu sisi dan contoh progres di sisi lain. Jalur titik dari logo menghubungkan keduanya secara dekoratif. Tidak menyebut pola titik dekoratif sebagai tulisan Braille.

Alternatif yang dipertimbangkan:

1. Dominan navy gelap: kuat untuk hero, tetapi tidak dipakai sebagai seluruh aplikasi karena logo dan konten panjang lebih nyaman di bidang terang.
2. Dashboard penuh kartu warna-warni seperti referensi: familiar, tetapi hierarki tindakan siswa menjadi kurang jelas.
3. Pilihan utama: putih dan biru sangat muda, teks navy, tombol biru tegas; satu komposisi buku yang khas di hero.

### Token warna inti

| Token | Hex | Pemakaian |
| --- | --- | --- |
| Brand navy | `#103C80` | Judul, identitas, footer |
| Action blue | `#1D63D8` | Tombol utama, tautan, pilihan aktif |
| Sky | `#8EC5FF` | Dekorasi dan latar aksen, bukan teks kecil pada putih |
| Canvas | `#F3F8FF` | Latar aplikasi dan section selingan |
| Paper | `#FFFFFF` | Area konten, form, kartu utama |
| Ink | `#142D4E` | Teks utama |

Teks sekunder: `#52677F`. Status berhasil/gagal/peringatan memakai ikon dan label serta warna semantik terpisah; bukan variasi biru yang sulit dibedakan.

Perhitungan pasangan warna rencana: Action blue/putih 5.49:1, navy/putih 10.61:1, Ink/Canvas 12.99:1, teks sekunder/putih 5.82:1. Sky/putih hanya 1.81:1, sehingga tidak dipakai untuk teks atau satu-satunya batas kontrol. Ini verifikasi pasangan token; seluruh keadaan komponen tetap perlu diuji.

### Tipografi dan ukuran

- Usulan font: Plus Jakarta Sans untuk judul/label, Source Sans 3 untuk teks panjang dan transkrip. Ini pilihan desain; belum dipasang. Siapkan fallback system sans dan font lokal agar aplikasi tetap dapat dibangun tanpa unduhan font saat build.
- UI siswa: teks utama 18 px setara `1.125rem`, line-height 1.65; kontrol utama 48-56 px, tombol mikrofon sekitar 64 px dengan label terlihat.
- UI guru: teks utama 16 px; tabel tidak mengorbankan keterbacaan demi jumlah baris.
- Hero: 56-64 px desktop, 36-40 px mobile; heading utuh, tidak mewarnai satu kata secara acak.
- Lebar teks sekitar 60-70 karakter; rata kiri. Angka statistik rata sesuai kolom.
- Spasi 4/8/12/16/24/32/48/64; radius kontrol 12 px, panel 20 px, komposisi hero 28 px. Bayangan tipis hanya untuk hierarki yang memerlukan elevasi.
- Desktop konten maksimal sekitar 1200 px; padding mobile 20 px; area baca siswa 720-800 px.
- Gerak hanya menjelaskan perubahan keadaan. Tidak ada autoplay audio, carousel otomatis, atau animasi latar yang terus bergerak.

## 5. Landing page

Tujuan: siswa dan guru memahami cara KODMOD membantu belajar, lalu memilih masuk atau melihat contoh sesi.

Urutan konten:

1. Header: logo asli, Cara belajar, Untuk guru, Aksesibilitas, tombol Masuk.
2. Hero: "Belajar dengan suara. Pahami dengan caramu." Deskripsi: "Tanya materi, latih pemahaman, dan dengarkan penjelasan langkah demi langkah bersama KODMOD." CTA "Mulai belajar" menuju masuk; CTA sekunder "Lihat contoh sesi" menuju demo berlabel.
3. Contoh percakapan: pertanyaan sederhana tentang pecahan, tutor mengajak siswa menjelaskan alasan. Tombol "Dengarkan contoh" hanya memutar audio setelah diminta; tersedia transkrip penuh. Sebelum aset suara tersedia, demo memakai teks dengan status yang jujur.
4. Cara belajar: pilih materi -> berdiskusi -> latihan -> pahami progres.
5. Untuk siswa dan guru: dua narasi tugas berbeda, tidak mengulang empat kartu fitur generik.
6. Aksesibilitas: keyboard, pembaca layar, kontrol suara, ukuran teks, padanan teks.
7. FAQ: cara mengakses akun, suara dan teks, peran guru, kebutuhan koneksi.
8. Penutup: "Mulai dari satu pertanyaan." Tombol Masuk sebagai siswa dan Masuk sebagai guru memberi konteks login, bukan menetapkan hak akses.

```text
DESKTOP
[ Logo ]     Cara belajar   Untuk guru   Aksesibilitas     [Masuk]

Belajar dengan suara.           / Buku terbuka ----------------\
Pahami dengan caramu.           | Siswa: Mengapa ...?           |
                               | Tutor: Mari kita coba ...     |
Deskripsi singkat              | [Dengarkan contoh] [Transkrip]|
[Mulai belajar] [Contoh sesi]   \------------------------------/

Pilih materi ----- Berdiskusi ----- Latihan ----- Progres
[Cerita siswa]                 [Alur kerja guru]
[Aksesibilitas]                [FAQ]
[Ajakan mulai]                                            [Footer]

MOBILE: header -> judul -> CTA -> contoh -> section lain satu kolom.
```

Tidak memasukkan nama model, pipeline agent, atau konfigurasi TTS pada jalur utama landing page. Kebutuhan integrasi dijelaskan dalam dokumentasi teknis.

## 6. Inventaris layar siswa

Navigasi utama: Beranda, Belajar, Kuis, Progres. Pengaturan suara/teks mudah ditemukan di header. Mobile memakai empat navigasi bawah berlabel; ruang bawah konten memperhitungkan navigasi dan safe area.

| Route rencana | Isi dan tindakan utama | Keadaan yang perlu dirancang |
| --- | --- | --- |
| `/masuk` | Nama pengguna, password, tampilkan password, Masuk | Isian salah, akun tidak aktif, menunggu, kegagalan koneksi |
| `/daftar` | Nama, username, password, kode undangan, konteks peran | Kode tidak berlaku, username terpakai, berhasil; bukan daftar email bebas |
| `/siswa/pengaturan` | Cara mendengarkan, uji suara, ukuran teks, kontras | Suara tidak tersedia, kembali ke pembaca layar, preferensi tersimpan |
| `/siswa` | Lanjut belajar, kuis menunggu, ringkasan singkat | Siswa baru, belum punya materi, sesi terakhir tersedia |
| `/siswa/belajar` | Materi per kelas/mata pelajaran, pencarian | Tidak ada materi, hasil kosong, materi belum siap |
| `/siswa/belajar/[id]` | Tujuan belajar, ringkasan, Mulai belajar | Materi siap atau belum dapat dibuka |
| `/siswa/sesi/[id]` | Tutor, transkrip, kontrol input/audio, sumber | Mendengarkan, memproses, berbicara, jeda, putus, retry |
| `/siswa/kuis` | Daftar penugasan, jumlah soal, status | Belum ada kuis, tersedia, sedang dikerjakan, selesai |
| `/siswa/kuis/[id]` | Petunjuk, satu soal per layar, jawaban suara/teks | Soal belum dijawab, transkripsi perlu koreksi, jawaban tersimpan/gagal |
| `/siswa/kuis/[id]/hasil` | Ringkasan, alasan jawaban, materi untuk diulang | Penilaian berlangsung, selesai, sebagian hasil belum tersedia |
| `/siswa/progres` | Ringkasan yang dapat didengar, konsep kuat/lemah, rekomendasi | Data belum cukup, progres tersedia; tanpa peringkat publik |

Preferensi suara ditawarkan setelah masuk pertama kali dan selalu dapat diubah. Tidak mencoba mendeteksi atau mematikan screen reader pengguna secara otomatis.

### Beranda siswa

```text
[Logo]                                      [Suara & tampilan]
Halo, Ahmad.
Siap melanjutkan belajar?

Lanjutkan: Pecahan
Terakhir: membandingkan dua pecahan
[Lanjut belajar]

Kuis dari guru                  Progres belajarmu
Matematika - 5 soal             Dua konsep sudah kamu latih
[Lihat kuis]                    [Dengarkan ringkasan]

[Beranda]       [Belajar]       [Kuis]       [Progres]
```

### Ruang tutor

```text
[Kembali]  Pecahan                           [Suara & tampilan]
Tujuan: memahami pecahan senilai

Tutor: Bagaimana menurutmu jika satu bagian dibagi lagi?
Siswa: ...
[Sumber materi] [Jelaskan lebih sederhana] [Ulangi penjelasan]

Status: Siap mendengarkan
[Mulai bicara] [Ketik pertanyaan]             [Akhiri sesi]
```

Transkrip menjadi konten utama, audio memiliki kontrol yang konsisten. Mini-kuis masuk sebagai satu pertanyaan terfokus dengan tombol "Jawab" dan "Minta penjelasan". Jawaban kurang tepat menghasilkan bantuan spesifik, bukan hanya warna merah atau skor.

### Kebijakan kuis

- Bedakan mode latihan dengan tugas penilaian. Latihan boleh menawarkan petunjuk/remediasi; tugas mengikuti aturan guru, tidak otomatis membocorkan kunci sebelum pengiriman akhir.
- Untuk prototipe awal, tugas tidak memakai hitung mundur. Aturan durasi, percobaan ulang, dan kapan pembahasan terbuka perlu keputusan produk sebelum integrasi.
- Jawaban suara ditranskripsikan dan dapat diperbaiki sebelum dikirim.
- Tampilkan nomor soal, status jawaban, serta konfirmasi sebelum mengakhiri kuis.
- Rumus matematika memiliki pembacaan verbal dan representasi teks semantik; hindari gambar rumus tanpa alternatif.

## 7. UI guru yang diselaraskan

Navigasi mengikuti referensi: Dashboard, Kelas, Kuis, Analitik; materi berada pada detail kelas. Pengelolaan akun admin bukan cakupan desain tahap ini.

| Route rencana | Fokus |
| --- | --- |
| `/guru` | Tindakan perlu perhatian, ringkasan kelas, aktivitas terbaru |
| `/guru/kelas` | Daftar dan pencarian kelas |
| `/guru/kelas/baru` | Info kelas -> mata pelajaran/siswa -> pengaturan dan review |
| `/guru/kelas/[id]` | Ringkasan, siswa, materi, kuis |
| `/guru/kelas/[id]/materi` | Unggah dan status antre/diproses/siap/gagal |
| `/guru/kuis` | Daftar draft, perlu validasi, dipublikasikan |
| `/guru/kuis/baru` | Pilih manual atau dari materi |
| `/guru/kuis/baru/manual` | Editor sesuai tipe soal, kunci/rubrik, urutan |
| `/guru/kuis/baru/ai` | Materi siap, jumlah soal, kesulitan, tipe |
| `/guru/kuis/[id]/validasi` | Edit/setujui/tolak, pratinjau siswa, konfirmasi publikasi |
| `/guru/analitik` | Filter kelas/kuis, ringkasan, grafik dan tabel alternatif |
| `/guru/siswa/[id]` | Progres konsep, sesi, dan rekomendasi tindak lanjut |

Pada ponsel, tabel menjadi daftar berlabel atau tabel dengan scroll yang terlokalisasi; judul, filter, dan tombol tetap terbaca. Status persetujuan tidak hanya diwakili border hijau/merah. Soal ditolak tetap dapat dibaca dan diedit, tidak dibuat transparan sampai sulit dibaca.

## 8. Kontrak interaksi suara dan aksesibilitas

### Keadaan suara

| Keadaan | Informasi terlihat/terbaca | Tindakan |
| --- | --- | --- |
| Siap | "Tekan Mulai bicara untuk bertanya" | Mulai bicara atau ketik |
| Izin mikrofon | Alasan mikrofon diperlukan | Izinkan lewat browser atau gunakan teks |
| Merekam | "Mendengarkan" dan indikator rekaman | Selesai bicara / Batalkan |
| Transkripsi | Teks yang dikenali | Edit, kirim, rekam ulang |
| Memproses | "Menyiapkan penjelasan" | Batalkan permintaan bila didukung |
| Berbicara | Teks jawaban dan posisi pemutaran | Jeda, lanjutkan, hentikan, ulangi |
| Gagal suara | "Suara belum tersedia. Penjelasan tetap bisa dibaca." | Coba suara lagi / gunakan teks |
| Putus koneksi | "Koneksi terputus. Jawabanmu belum terkirim." | Coba kirim lagi; input tidak dihapus |

Memulai mikrofon menghentikan audio tutor terlebih dahulu. Pergantian route atau mode menghentikan audio lama. Tidak ada dua pemutar berjalan bersamaan. Prototipe harus membedakan simulasi status dari perekaman atau pemutaran sungguhan.

### Dua mode penyampaian

- **Pembaca layar saya:** audio aplikasi mati secara default; jawaban lengkap tersedia di transkrip dan perubahan diumumkan seperlunya melalui live region. Potongan streaming tidak dibacakan token demi token.
- **Suara KODMOD:** TTS aktif setelah tindakan pengguna; transkrip tetap tersedia. Tidak mengumumkan jawaban yang sama bersamaan lewat live region. Error/status penting tetap punya padanan teks yang bisa diakses. Preferensi pengguna menentukan perilaku, tanpa auto-detection screen reader.

### Kriteria aksesibilitas rencana

- Semua perjalanan utama bisa diselesaikan dengan keyboard. Fokus terlihat, urutan fokus sesuai urutan konten, dialog mengembalikan fokus ke pemicu.
- Target kontrol produk minimal 44 x 44 CSS px; kontrol utama siswa minimal 48 px. Angka 44 adalah pilihan desain produk. WCAG 2.2 AA 2.5.8 menetapkan minimum 24 x 24 dengan pengecualian, bukan 44 x 44.
- Kontras teks biasa minimal 4.5:1; teks besar minimal 3:1; batas/indikator kontrol penting diperiksa terhadap latar yang bersebelahan.
- Uji 320/390/768/1440 px, zoom 200%, dan reflow setara 400% desktop; tidak ada kehilangan tindakan penting.
- Jangan mengandalkan warna, ikon, hover, grafik, atau audio saja.
- Input memiliki label; error menjelaskan cara memperbaiki dan terkait dengan field. Status tersimpan diumumkan tanpa memindahkan fokus.
- NVDA/Windows dan TalkBack/Android masuk review manual; pemeriksaan otomatis tidak menggantikan keduanya.
- Hotkey opsional harus dapat dimatikan dan tidak mengambil alih tombol navigasi pembaca layar. Kontrol biasa tetap cukup untuk menyelesaikan alur.
- Mengubah ukuran teks dan kontras tidak boleh menyembunyikan tombol utama.

Referensi: [W3C Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum), [W3C Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum).

## 9. Kesesuaian dengan backend saat ini

Tabel ini adalah hasil pembacaan kode, bukan hasil pengujian integrasi backend baru.

| Kebutuhan UI | Dasar saat ini | Perlakuan dalam prototipe |
| --- | --- | --- |
| Login/register | `/auth` memakai username, password, invitation code | Form mengikuti kontrak; role dari server saat integrasi |
| Mata pelajaran dan dokumen | `/subjects`, dokumen dan status ingestion tersedia | Data contoh dengan keadaan siap/gagal |
| Chat dan riwayat | REST `/chat` dan `/ws/chat` tersedia | Adapter demo, transkrip dan status interaksi |
| Analitik siswa/guru | Endpoint analitik dan detail siswa tersedia | Ringkasan contoh yang konsisten dengan hasil kuis |
| Kelas/keanggotaan/penugasan | Model kelas dan penugasan belum ada dalam ORM yang diperiksa; guru melihat semua siswa | Entitas desain terpisah; jangan mengganti nama Subject menjadi Class |
| Kuis guru, review, publikasi | `/quiz/start` sekarang menghasilkan kuis adaptif siswa; belum merupakan alur editorial guru | State draft/review/publish disimulasikan; backend baru dibutuhkan untuk produksi |
| Suara ElevenLabs | Modul voice tersedia, jalur suara belum terintegrasi penuh ke API aktif/frontend | Antarmuka suara disiapkan; integrasi dan uji audio tahap berikutnya |

Kunci API OpenAI/ElevenLabs hanya berada di backend. Browser menggunakan kontrak aplikasi, bukan memanggil penyedia menggunakan secret yang dipasang di `NEXT_PUBLIC_*`.

Entity rencana yang belum menjadi kontrak backend: Class, Enrollment, QuizDraft, QuestionReview, PublishedQuiz, Assignment. Materi/mata pelajaran, kuis terbit, dan hasil pengerjaan siswa mempunyai identitas terpisah. Rencana UI tidak mengubah schema backend sekarang.

## 10. Urutan pengerjaan sesudah review rencana

### Tahap A: fondasi visual dan navigasi

- [x] Tetapkan token warna, tipografi, ukuran teks, jarak, fokus native, serta penggunaan logo pada prototipe.
- [x] Buat wireframe desktop/mobile untuk landing page, beranda siswa, sesi tutor, pengerjaan kuis, dan dashboard guru.
- [ ] Review satu contoh perjalanan siswa dan satu perjalanan guru sebelum menambah layar lain.

Pratinjau interaktif: `output/ui-prototype/kodmod-blueprint.html`. Berisi landing page, ruang siswa, tutor, kuis dua soal, hasil/progres, dashboard guru, serta peninjauan soal. Tombol Ponsel menampilkan susunan mobile. Seluruh data, percakapan, suara, dan publikasi merupakan simulasi lokal. Implementasi halaman Next.js dan integrasi API tetap berada pada tahap berikutnya.

Hasil: arah visual dan navigasi yang dapat disetujui, termasuk ukuran mobile dan alur keyboard.

### Tahap B: landing page, masuk, dan preferensi

- [ ] Bangun landing page sesuai struktur section di bagian 5.
- [ ] Bangun form akun berdasarkan username dan kode undangan; validasi desain tanpa mengklaim login nyata.
- [ ] Buat pengaturan suara/teks dan pratinjau perubahan.
- [ ] Verifikasi semua CTA menuju tujuan yang jelas dan tidak ada klaim atau audio otomatis.

Hasil: prototipe masuk menuju beranda siswa/guru dengan penanda data contoh.

### Tahap C: perjalanan siswa yang lengkap

- [ ] Bangun beranda -> materi -> tutor -> mini-kuis -> ringkasan.
- [ ] Bangun daftar kuis -> petunjuk -> jawaban -> review -> hasil -> progres.
- [ ] Simulasikan keadaan mendengarkan, transkripsi, memproses, berbicara, error, dan koneksi putus.
- [ ] Verifikasi input tidak hilang pada retry dan navigasi tidak meninggalkan audio aktif.

Hasil: satu perjalanan siswa dapat diselesaikan lewat klik maupun keyboard dengan data contoh yang konsisten.

### Tahap D: guru sesuai referensi yang sudah dibenahi

- [ ] Bangun kelas -> materi/siswa -> kuis manual/AI -> validasi -> publikasi contoh.
- [ ] Bangun analitik dan detail siswa yang memakai dataset contoh yang sama.
- [ ] Verifikasi soal belum disetujui tidak ikut publikasi dan perubahan soal membatalkan persetujuan versi sebelumnya.

Hasil: perjalanan guru dapat dijelaskan dan diuji tanpa berpura-pura backend kelas sudah tersedia.

### Tahap E: review dan kesiapan integrasi

- [ ] Uji state kosong/loading/error pada halaman kritis.
- [ ] Uji NVDA, TalkBack, keyboard, zoom, kontras, dan layout responsif.
- [ ] Jalankan build, lint, typecheck; tambahkan uji perjalanan yang memeriksa hasil pengguna, bukan menyalin implementasi.
- [ ] Buat daftar kontrak API yang perlu dilengkapi untuk kelas, penugasan, review/publikasi, STT, dan ElevenLabs.

Hasil: UI/UX siap diintegrasikan; belum merupakan klaim seluruh aplikasi siap produksi.

## 11. Struktur frontend yang diusulkan

Ini peta untuk tahap implementasi, bukan file yang telah dibuat.

```text
apps/web/src/
  app/
    (public)/page.tsx                    landing page /
    (auth)/masuk/page.tsx
    (auth)/daftar/page.tsx
    siswa/layout.tsx                    navigasi dan shell siswa
    siswa/page.tsx                      beranda
    siswa/belajar/[id]/page.tsx
    siswa/sesi/[id]/page.tsx
    siswa/kuis/[id]/page.tsx
    siswa/kuis/[id]/hasil/page.tsx
    siswa/progres/page.tsx
    siswa/pengaturan/page.tsx
    guru/layout.tsx                     navigasi dan shell guru
    guru/...                            route sesuai tabel bagian 7
  components/
    brand/                              logo dan ilustrasi buku
    ui/                                 tombol, input, dialog, state kosong
    accessibility/                      preferensi, fokus, pengumuman
  features/
    landing/                            section landing page
    learning/                           transkrip, materi, mini-kuis
    voice/                              kontrol dan keadaan suara
    quiz/                               soal, jawaban, review, hasil
    teacher/                            kelas, editor, validasi
    analytics/                          ringkasan dan alternatif tabel
  lib/
    api.ts                              helper HTTP browser yang sudah ada
    demo/                               data contoh dan adapter prototipe
  styles/index.css                      token dan aturan global
```

Saat landing page dipindah ke `(public)/page.tsx`, hapus atau pindahkan `app/page.tsx` lama agar tidak ada dua route `/`. App Router menangani navigasi; React Router tidak dipasang kembali. Bagian statis memakai Server Components; form, preferensi, sesi, dan kontrol suara memakai Client Components.

Logo runtime perlu disalin ke `apps/web/public/brand/` pada tahap implementasi. Folder `archive/` tetap bahan referensi lokal dan tidak masuk bundle maupun commit. Aset logo sumber tetap di `assets/logo/`.

## 12. Review sebelum implementasi

Pilihan utama yang diajukan: landing page beridentitas buku terbuka, aplikasi terang dengan navy/biru, UI siswa berfokus pada tindakan belajar dan suara, serta UI guru mengikuti alur referensi dengan label dan hierarki yang dibenahi.

Keputusan yang dapat disesuaikan saat review: jenjang siswa utama; nama tampilan tutor (default "KODMOD"); aturan durasi dan percobaan kuis. Keputusan penyedia STT dan model GPT dibuat sebelum integrasi suara/AI, bukan penghalang menyusun UI/UX.

Dokumen ini ditinggalkan sebagai draf lokal setelah commit baseline, supaya review rencana tidak tercampur dengan perubahan inisiasi Next.js yang sudah di-push.
