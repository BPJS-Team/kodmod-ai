# Registrasi, suara, dan bahasa KODMOD

Status 4 Oktober 2026: handoff ini sudah diimplementasikan. Rincian pemeriksaan ada di [hasil validasi](../auth-voice-language-validation-2026-10-04.md).

## Yang tersedia

- Siswa dan guru mendaftar tanpa kode undangan; admin tetap tidak dapat dibuat lewat registrasi publik.
- Setup awal menyediakan panduan dan contoh suara KODMOD/perangkat. Default suara KODMOD, pembaca menu ON, Tutor ON. Pilihan, low vision, dan navigasi geser tersimpan di perangkat.
- Navbar semua ruang menyediakan suara menu ON/OFF, pengaturan, dan ID/EN. Menu OFF tidak mematikan jawaban Tutor baru yang otomatis dibacakan.
- Satu koordinator mengatur output: pause/replay/stop, membatalkan audio tertunda, menjaga Tutor dari gangguan menu. Rekaman ditinjau sebagai teks sebelum dikirim.
- Endpoint menu tamu hanya mengenal teks aplikasi yang dibatasi server. TTS teks bebas membutuhkan akun aktif; cache audio privat dipisahkan per akun.
- Audio disimpan di browser dan volume Docker. Kunci mencakup teks, bahasa, profil/preset, dan cakupan pengguna. Penulisan atomik dan kunci lintas proses mencegah generasi ganda. Masa simpan server 30 hari, batas 1 GiB; browser 50 audio / 64 MB.
- Bahasa disimpan lewat cookie dan profil akun. Login mengikuti profil; logout mempertahankan bahasa perangkat. Prompt AI, STT, suara perangkat, serta kalimat kuis/scoring memakai bahasa tiap permintaan.
- UI memakai kamus terpusat, label aksesibel, switch shadcn, dan tanggal sesuai locale. Konten guru tetap dalam bahasa aslinya.
- Landing/auth disederhanakan: copy fungsional, tema navy/biru, tanpa penjelasan provider/key/cache untuk pengguna. Tombol simpan popup tetap terlihat saat badan popup digulir.

Browser dapat menahan autoplay sampai ada interaksi. Tombol **Dengarkan panduan** dan **Dengarkan** menjadi jalur aktivasi; teks tetap tersedia.

## Lanjutan yang diminta pengguna

1. Bacakan menu saat hover, selain fokus keyboard dan klik; tetap cegah pemotongan Tutor/rekaman.
2. Bacakan konfirmasi saat bahasa berubah dalam bahasa tujuan, memakai katalog audio server.
3. Uji dokumen nyata dari folder `materi`, termasuk buku banyak bab dan modul satu topik. Evaluasi ekstraksi, indeks, cakupan sumber, dan pembagian bab.
4. Hitung progres scope dengan kriteria yang jelas, bukan jumlah komponen atau tes.

Pengguna melakukan sendiri pengujian klik/browser. Pemeriksaan berikutnya oleh agen melalui kode/API.

## Batas validasi

Cache/deduplikasi dan isolasi bahasa diuji dengan provider mock; preview Bian nyata juga mengembalikan MP3 melalui Next. Hasil nyata tidak menyatakan seluruh percakapan AI, mikrofon, atau perangkat assistive sudah tervalidasi.

TalkBack, VoiceOver, NVDA, izin mikrofon, zoom 200–400%, serta deployment VPS tetap perlu pengujian pengguna/perangkat. Pemetaan konsep/mastery penugasan, OCR yang ditinjau guru, dan draft soal AI adalah milestone terpisah. Planner Agent tetap tidak termasuk scope saat ini.
