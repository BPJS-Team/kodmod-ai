import "server-only";

import { NextResponse } from "next/server";
import { session } from "@/lib/session";

function apiOrigin() {
  return (process.env.API_ORIGIN ?? "http://127.0.0.1:8109").replace(/\/$/, "");
}

function messageFor(status: number) {
  if (status === 401 || status === 403) return "Sesi berakhir. Silakan masuk kembali.";
  if (status === 404) return "Sesi percakapan tidak ditemukan. Muat ulang daftar.";
  if (status === 422) return "Pertanyaan belum sesuai. Tulis minimal satu karakter.";
  if (status === 429) return "Terlalu banyak pertanyaan. Tunggu sebentar lalu coba lagi.";
  if (status === 503) return "Tutor AI belum dapat dihubungi. Coba lagi beberapa saat.";
  return "Tutor AI sedang mengalami kendala. Coba lagi beberapa saat.";
}

export async function forwardChat(path: string, init: RequestInit = {}) {
  const current = await session();
  if (!current) {
    return NextResponse.json(
      { message: "Sesi berakhir. Silakan masuk kembali." },
      { status: 401 },
    );
  }
  if (current.user.role !== "student") {
    return NextResponse.json({ message: "Ruang tutor hanya tersedia untuk siswa." }, { status: 403 });
  }

  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${current.token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  let upstream: Response;
  try {
    upstream = await fetch(`${apiOrigin()}${path}`, {
      ...init,
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return NextResponse.json({ message: messageFor(503) }, { status: 503 });
  }

  if (upstream.status === 204) return new NextResponse(null, { status: 204 });

  const raw = await upstream.text();
  if (!upstream.ok) {
    return NextResponse.json(
      { message: messageFor(upstream.status) },
      { status: upstream.status },
    );
  }

  try {
    return NextResponse.json(JSON.parse(raw), { status: upstream.status });
  } catch {
    return NextResponse.json({ message: "Respons tutor AI tidak valid." }, { status: 502 });
  }
}
