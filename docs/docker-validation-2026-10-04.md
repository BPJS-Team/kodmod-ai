# Validasi Docker KODMOD, 4 Oktober 2026

## Hasil yang diamati

- Docker Desktop Linux engine 29.8.1 aktif. `npm run docker:up` selesai dengan exit 0.
- Project `kodmod-centre`: PostgreSQL, Redis, AI engine dan Next.js semuanya **healthy**.
- Service migration selesai exit 0; `alembic_version` adalah `0005_assessment_submissions`.
- Data tetap pada bind mounts `F:/Docker_Centre/kodmod/data/{postgres,redis,audio,uploads}`. Tidak menghapus volume atau memakai schema SQL lama.
- Web `127.0.0.1:3100`, API `127.0.0.1:8109`; koneksi antarkontainer melalui DNS Compose. Port database/cache lokal dibatasi loopback.
- `node scripts/check-docker.mjs`: **12 checks passed** untuk halaman login/landing, logo/ilustrasi, CSS/JS, live/ready, fallback Next, redirect siswa dan 401 tanpa autentikasi.
- Next.js **16.3.8**, launcher `/app/apps/web/server.js`, `.next/static` dan `public/brand` tersedia. Web UID 1000; API UID 1001.
- `.env` backend dan `.env.local` frontend tidak berada dalam image. PDF unggahan runtime dikecualikan dari konteks backend; folder kosong dapat dibuat saat import Settings.
- LangChain, LangGraph dan parser DOCX `defusedxml` tersedia; `pip check` bersih. Image default tidak memasang torch/CUDA/reranker lokal.
- PostgreSQL memiliki extension `vector` dan tabel checkpoint LangGraph. Probe file sementara pada mount audio/unggahan membuktikan UID API dapat menulis, lalu probe dibuang.
- Compose VPS dan entry kompatibilitas lama lolos `config --quiet` dengan variabel validasi. Hanya Caddy membuka port host 80/443. `caddy validate` pada image `caddy:2-alpine` lulus.

## Tes regresi

Backend memakai dependensi yang benar-benar terpasang pada image Linux. Container tes sementara memasang pytest/pytest-asyncio/aiosqlite/pytest-mock, menjalankan:

```bash
python -m pytest tests/assessment_test.py tests/unit/test_mini_quiz_scope.py tests/unit/test_material_pipeline.py tests/unit/test_student_model.py -q
```

**55 passed**, satu warning Pydantic Config lama. Test container tidak menerima env/provider key aplikasi. Graph/provider pada tes merupakan boundary simulasi.

Rerun `tests/integration/test_assessment_transactions.py` pada database khusus `127.0.0.1:5434/kodmod_test`: **4 passed**. PostgreSQL/Redis test-only dihentikan setelah pengujian; volume tetap tersedia. Database aplikasi port 5433 tidak dipakai untuk tes tersebut.

Frontend:

```bash
node --test --test-reporter=spec apps/web/tests/cookie-security.test.mjs apps/web/tests/reading-preferences.test.mjs apps/web/tests/speech-preferences.test.mjs apps/web/tests/quiz-submission.test.mjs apps/web/tests/material-flow.test.mjs
npm run lint:web
npm run typecheck:web
npm run build:web
```

**45 tests passed**; lint/typecheck/build lulus. Cookie tests menjalankan Server Actions dengan Next/backend boundary terisolasi. Cookie tetap HttpOnly/SameSite, flag lokal dibaca dari server dan tidak dapat ditimpa form browser. Build standalone Linux pada Docker juga lulus.

Runtime audit npm sesudah update Next: **0 advisory**. Full audit masih memiliki **5 high dev-only** pada rantai `eslint-config-next → fast-glob → micromatch → braces`; belum tersedia patch braces. Tidak mengubah framework/config dengan downgrade major. [Next official advisory](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j), [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

## Batas validasi

Tidak membuat akun admin pada database aplikasi; bootstrap admin meminta password interaktif, sesuai [panduan deployment](DEPLOYMENT.md). Belum menjalankan login dengan akun nyata, Tutor OpenAI, ElevenLabs Bian/Scribe berakun nyata, AT/perangkat nyata, varian image reranker, atau deployment DNS/TLS/VPS. Tidak menyimpulkan kualitas pedagogi, kapasitas produksi, maupun keamanan menyeluruh dari healthcheck atau tes simulasi.
