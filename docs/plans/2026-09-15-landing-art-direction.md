# KODMOD: arahan visual landing page

## Konsep utama: pengetahuan membuka dunia

Tampilan mengambil kedalaman visual website crypto: navy gelap, cahaya biru, orbit tipis, objek melayang, dan panel kaca. Ceritanya tetap tentang pendidikan inklusif. Hindari koin, grafik harga, robot generik, dan simbol investasi. Bagian penjelasan memakai latar terang agar nyaman dibaca.

Ilustrasi SVG saat ini adalah **placeholder komposisi**, bukan aset final. Tim desain boleh mengubah detail objek sambil mempertahankan ruang kosong, arah cahaya, dan titik fokus. Tiga slot sudah dipakai pada halaman utama.

## 01. Hero: ruang pengetahuan

- File sementara: `apps/web/public/images/landing/hero-learning.svg`.
- Hasil akhir: `hero-learning.webp`, 1600 × 1600 px, rasio 1:1, transparan. Target di bawah 350 KB.
- Konsep: buku terbuka 3D dengan material kaca buram dan sisi biru. Dari tengah buku muncul jalur cahaya atau bintang yang membentuk dunia pengetahuan. Hubungkan bentuknya dengan buku dan jalur pada logo KODMOD.
- Komposisi: buku berada di tengah bawah, sudut pandang tiga perempat. Objek utama berada di tengah 65% kanvas. Ruang kanan atas dan kiri bawah sengaja longgar untuk label HTML yang sudah tersedia.
- Cahaya: biru lembut dari bawah buku, pantulan putih kebiruan di tepi. Bayangan transparan, jangan memasukkan kotak background navy ke gambar.
- Hindari detail teks pada halaman buku, ikon terlalu banyak, atau pantulan putih yang menyilaukan. Logo asli tetap dipakai terpisah di navigasi.
- Label “Setiap suara berarti” dan “Satu langkah lebih paham” adalah elemen halaman; jangan digambar ulang dalam aset.

## 02. Siswa: rasa ingin tahu menjadi percakapan

- File sementara: `apps/web/public/images/landing/student-voice.svg`.
- Hasil akhir: `student-voice.webp`, 1440 × 1620 px, rasio 8:9. Target di bawah 250 KB.
- Konsep: ilustrasi editorial seorang siswa Indonesia sedang belajar menggunakan perangkat dengan dukungan suara. Gesture aktif, percaya diri, dan penasaran. Gunakan gelombang suara abstrak sebagai penghubung siswa dan materi.
- Gaya: ilustrasi 3D lembut atau ilustrasi semi-flat bertekstur halus. Pertahankan satu gaya yang konsisten dengan hero.
- Latar: navy dan biru yang menyatu dengan panel. Fokus wajah/tangan/perangkat di area tengah atas. Sisakan bagian bawah sekitar 25% untuk judul HTML.
- Area aman: bagian penting di tengah 65% lebar dan pada 20–60% tinggi. Panel dipotong menjadi sekitar 1:1 di desktop dan 6:5 di mobile, jadi ujung kanvas hanya dekorasi.
- Representasi: tampilkan siswa sebagai pelaku aktif. Hindari stereotip kasihan, simbol mata dicoret, atau menganggap semua tunanetra harus memakai kacamata hitam. Minta tinjauan pendamping pendidikan inklusif untuk detail penggunaan perangkat.

## 03. Guru: tumbuh bersama

- File sementara: `apps/web/public/images/landing/teacher-support.svg`.
- Hasil akhir: `teacher-support.webp`, 1600 × 1200 px, rasio 4:3, transparan. Target di bawah 250 KB.
- Konsep: guru mendampingi siswa dengan lembar materi atau tablet di antara mereka. Tambahkan bentuk halaman dan jalur yang terhubung untuk menunjukkan proses, bukan sekadar angka hasil.
- Komposisi: dua tokoh menghadap aktivitas bersama, objek di tengah, ruang aman 10% di semua sisi. Tetap mudah dikenali pada lebar 280 px.
- Latar sudah disiapkan berupa gradasi biru pucat. Aset boleh transparan agar menyatu. Bayangan lembut, aksen navy pada tokoh dan biru pada materi.
- Placeholder sekarang berupa panel materi abstrak untuk menjaga susunan halaman. Jangan menyalin grafik placeholder sebagai klaim data nyata atau screenshot produk final.

## Bahasa visual bersama

- Navy: `#061329`; biru utama: `#2565E9`; biru muda: `#89BAFF`; cahaya: `#B5E9FF`; latar terang: `#F3F7FC`.
- Huruf website: Plus Jakarta Sans untuk judul, Source Sans 3 untuk isi. **Tidak perlu menaruh teks dalam gambar.**
- Material lembut, bentuk membulat, garis tipis. Hindari warna neon pelangi atau gaya cyberpunk agresif.
- Background orbit dan grid dibuat dengan CSS. Tim desain tidak perlu menyiapkan background besar; ini menjaga ketajaman dan ringan di mobile.
- Kirim file sumber berlayer beserta ekspor WebP. SVG boleh untuk ilustrasi vektor sederhana; pastikan tidak mengandung skrip, tautan eksternal, atau font tertanam.
- Ilustrasi saat ini dekoratif (`alt=""`) karena pesannya sudah ada di teks. Bila hasil akhir menyampaikan informasi tambahan, tambahkan deskripsi alternatif yang sesuai. Jangan memasukkan instruksi belajar hanya dalam gambar.

## Cara memasang aset final

1. Taruh ekspor di `apps/web/public/images/landing/` dengan nama hasil akhir di atas.
2. Di `apps/web/src/app/page.tsx`, ganti tiga `src` dari `.svg` menjadi `.webp`. Rasio `width`/`height` yang sudah ada sama dengan rasio ekspor; layout tetap stabil.
3. Tambahkan `sizes` sesuai lebar tampil: hero dan guru `(max-width: 760px) 100vw, 50vw`; siswa `(max-width: 760px) 100vw, 45vw`.
4. Periksa desktop, 375 px, dan 320 px: wajah/objek tidak terpotong, teks overlay terbaca, tidak ada pergeseran layout. Uji mode reduced motion; ilustrasi hero tidak boleh terus bergerak di mode itu.
5. Setelah disetujui, placeholder SVG dapat dihapus. Jangan menghapus logo pada folder `public/brand`.

## Isi dan navigasi

Urutan: hero → pengenalan → empat langkah belajar → guru/sekolah → aksesibilitas → FAQ → ajakan masuk. Navigasi atas melekat saat scroll; versi mobile memakai menu ringkas. FAQ menjelaskan status pengembangan tutor/voice/latihan agar ilustrasi konsep tidak disalahartikan sebagai fitur yang sudah selesai.
