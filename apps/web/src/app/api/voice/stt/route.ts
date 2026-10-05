import { NextResponse } from "next/server";
import { session } from "@/lib/session";

export const runtime = "nodejs";

function apiOrigin() {
  return (process.env.API_ORIGIN ?? "http://127.0.0.1:8109").replace(/\/$/, "");
}

export async function POST(request: Request) {
  const current = await session();
  if (!current) {
    return NextResponse.json({ message: "Sesi berakhir. Silakan masuk kembali." }, { status: 401 });
  }

  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return NextResponse.json({ message: "Rekaman suara tidak valid." }, { status: 400 });
  }
  const audio = incoming.get("audio");
  if (!(audio instanceof File)) {
    return NextResponse.json({ message: "Rekaman suara belum dipilih." }, { status: 400 });
  }
  if (audio.size === 0) {
    return NextResponse.json({ message: "Rekaman suara kosong." }, { status: 400 });
  }
  if (audio.size > 25 * 1024 * 1024) {
    return NextResponse.json({ message: "Rekaman suara terlalu besar." }, { status: 413 });
  }

  const outgoing = new FormData();
  outgoing.append("audio", audio, audio.name || "jawaban.webm");

  let upstream: Response;
  try {
    upstream = await fetch(`${apiOrigin()}/voice/stt`, {
      method: "POST",
      headers: { Accept: "application/json", Authorization: `Bearer ${current.token}` },
      body: outgoing,
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    return NextResponse.json(
      { message: "Layanan transkripsi belum dapat dihubungi. Coba lagi." },
      { status: 503 },
    );
  }

  if (!upstream.ok) {
    const message =
      upstream.status === 503
        ? "Fitur transkripsi belum diaktifkan oleh pengelola."
        : upstream.status === 401 || upstream.status === 403
          ? "Sesi berakhir. Silakan masuk kembali."
          : "Suara belum dapat dibaca. Coba rekam ulang.";
    return NextResponse.json({ message }, { status: upstream.status });
  }
  return NextResponse.json(await upstream.json(), { status: 200 });
}
