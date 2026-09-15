# @kodmod/web

Frontend KODMOD: Next.js App Router + React 19 + TypeScript + Tailwind CSS v4.

## Menjalankan

Dari root repository:

```bash
npm install
npm run dev:web       # http://localhost:3100
npm run build:web     # build produksi
npm run start:web     # jalankan hasil build di port 3100
npm run lint:web
npm run typecheck:web
```

Gunakan Node.js >=20.9.0 (disarankan Node.js 22 LTS).
Untuk konfigurasi lokal, salin `apps/web/.env.example` ke `apps/web/.env.local`.
Halaman awal bisa dibuka tanpa backend. Panggilan data memerlukan FastAPI yang aktif.

Port default 3100 menghindari reservasi port 3000 pada lingkungan Windows lokal.
Untuk mengganti port: `npm run dev:web -- --port 3200` dari root repository,
atau `npm run dev -- --port 3200` dari `apps/web`.

## Struktur awal

- `src/app/layout.tsx`: root layout, bahasa Indonesia, metadata, dan CSS global.
- `src/app/page.tsx`: halaman awal.
- `src/App.tsx`: kerangka interaktif pemilih mode suara (Client Component).
- `src/components/`: skip link dan pengumuman pembaca layar.
- `src/lib/api.ts`: helper HTTP untuk pemanggilan dari browser.

Routing memakai App Router bawaan Next.js. Tambahkan halaman lewat folder `src/app`.

## Koneksi backend

`API_ORIGIN` adalah alamat FastAPI untuk server Next.js, default
`http://127.0.0.1:8000`. Rewrite mengubah `/api/auth/me` menjadi
`http://127.0.0.1:8000/auth/me`; prefiks `/api` tidak diteruskan ke backend.
`NEXT_PUBLIC_API_BASE` mengatur basis URL di browser, default `/api`.
Variabel `NEXT_PUBLIC_*` masuk ke bundle browser: jangan isi dengan rahasia.

Klien WebSocket belum dibuat. Saat diintegrasikan, gunakan koneksi langsung ke
FastAPI (`ws://127.0.0.1:8000/ws/chat` saat lokal), atau reverse proxy yang mendukung
WebSocket di produksi. Contoh `NEXT_PUBLIC_WS_URL` disiapkan di `.env.example`;
variabel ini belum digunakan. Untuk koneksi langsung, tambahkan
`http://localhost:3100` ke `CORS_ALLOW_ORIGINS` backend.
Gunakan HTTPS/WSS pada deployment publik.

Untuk produksi, jalankan server Next.js setelah build dan arahkan reverse proxy
ke port 3100. Konfigurasi Docker/Caddy yang ada belum dimigrasikan untuk menjalankan
frontend Next.js. Inisiasi ini belum mencakup login, dashboard, chat, atau suara.

Referensi: [Next.js App Router](https://nextjs.org/docs/app) dan
[Tailwind untuk Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs).

## Aturan yang nggak boleh dilanggar

Aplikasi ini dipakai orang yang nggak melihat layar. Empat hal berikut adalah syarat produk, bukan sekadar preferensi:

1. **Setiap alur harus bisa diselesaikan tanpa mouse.** Uji pakai Tab/Shift-Tab aja.
2. **Cincin fokus nggak boleh dihapus.** `outline: none` tanpa pengganti itu regresi.
3. **Setiap informasi yang keluar lewat TTS harus punya padanan di `LiveRegion`.** Pengguna mode "pembaca layar saya" harus tetap dapat informasi yang sama.
4. **Nggak boleh ada dua suara sekaligus.** Kalau TTS lagi aktif, konten yang sama jangan sampai dikirim juga ke live region sebagai `assertive`.

Setiap PR yang menyentuh antarmuka wajib lolos keempat poin di atas.

Uji minimal sebelum merge: **NVDA di Windows** dan **TalkBack di Android**.
