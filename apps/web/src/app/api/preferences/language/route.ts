import { NextResponse } from "next/server";
import { session } from "@/lib/session";
import { backend, BackendError } from "@/lib/server-api";
import { LANGUAGE_COOKIE, validLanguage } from "@/lib/i18n.mjs";
import { sessionCookieSecure } from "@/lib/cookie-security";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return new Response(null, { status: 403 });
  let body;
  try { body = await request.json(); } catch { return new Response(null, { status: 400 }); }
  if (!validLanguage(body?.language)) return new Response(null, { status: 400 });
  try {
    const current = await session();
    if (current) await backend("/auth/me", current.token, { method: "PATCH",
      body: JSON.stringify({ preferred_language: body.language }) });
  } catch (error) {
    return NextResponse.json({ message: "Language could not be saved." },
      { status: error instanceof BackendError && [401, 403].includes(error.status) ? error.status : 503 });
  }
  const response = NextResponse.json({ language: body.language });
  response.cookies.set(LANGUAGE_COOKIE, body.language, { path: "/", maxAge: 365 * 86400,
    sameSite: "lax", secure: sessionCookieSecure() });
  return response;
}
