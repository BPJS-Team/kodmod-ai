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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Permintaan audio tidak valid." }, { status: 400 });
  }
  const text =
    typeof body === "object" && body !== null && "text" in body
      ? String(body.text ?? "").trim()
      : "";
  if (!text || text.length > 5_000) {
    return NextResponse.json(
      { message: "Teks yang akan dibacakan harus berisi 1 sampai 5.000 karakter." },
      { status: 400 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${apiOrigin()}/voice/tts`, {
      method: "POST",
      headers: {
        Accept: "audio/mpeg, audio/wav",
        "Content-Type": "application/json",
        Authorization: `Bearer ${current.token}`,
      },
      body: JSON.stringify({ text }),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return NextResponse.json(
      { message: "Layanan suara belum dapat dihubungi. Coba lagi." },
      { status: 503 },
    );
  }

  if (!upstream.ok) {
    const message =
      upstream.status === 503
        ? "Fitur suara belum diaktifkan oleh pengelola."
        : upstream.status === 401 || upstream.status === 403
          ? "Sesi berakhir. Silakan masuk kembali."
          : "Audio belum dapat dibuat. Coba lagi.";
    return NextResponse.json({ message }, { status: upstream.status });
  }

  return new Response(await upstream.arrayBuffer(), {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": upstream.headers.get("content-type") ?? "audio/mpeg",
    },
  });
}
