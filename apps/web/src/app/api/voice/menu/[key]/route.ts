import { NextResponse } from "next/server";
import { validLanguage } from "@/lib/i18n.mjs";

export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params;
  const language = new URL(request.url).searchParams.get("language") ?? "id";
  if (!validLanguage(language) || !/^[a-z-]{1,32}$/.test(key)) return new Response(null, { status: 400 });
  const origin = (process.env.API_ORIGIN ?? "http://127.0.0.1:8109").replace(/\/$/, "");
  try {
    const upstream = await fetch(`${origin}/voice/menu/${encodeURIComponent(key)}?language=${language}`, {
      cache: "no-store", signal: AbortSignal.timeout(75_000),
    });
    if (!upstream.ok) return NextResponse.json({ message: "Audio belum dapat dibuat. Coba lagi." }, { status: upstream.status });
    return new Response(await upstream.arrayBuffer(), { headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "audio/mpeg",
      "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff",
    } });
  } catch {
    return NextResponse.json({ message: "Layanan suara belum dapat dihubungi. Coba lagi." }, { status: 503 });
  }
}
