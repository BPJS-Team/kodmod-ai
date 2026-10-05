import { session } from "@/lib/session";
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

export async function GET() {
  try {
    const current = await session();
    const upstream = await fetch(`${(process.env.API_ORIGIN ?? "http://127.0.0.1:8109").replace(/\/$/, "")}/voice/profile`,
      { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (!upstream.ok) return new Response(null, { status: 503 });
    const data = await upstream.json();
    if (typeof data.profile !== "string") return new Response(null, { status: 502 });
    return NextResponse.json({ profile: data.profile,
      scope: current ? createHash("sha256").update(current.user.id).digest("hex") : "guest" },
    { headers: { "Cache-Control": "no-store" } });
  } catch { return new Response(null, { status: 503 }); }
}
