import { NextResponse } from "next/server";
import { session } from "@/lib/session";
import { backend, BackendError } from "@/lib/server-api";
import { LANGUAGE_COOKIE, validLanguage } from "@/lib/i18n.mjs";
import { sessionCookieSecure } from "@/lib/cookie-security";
import { sameEditorialOrigin } from "@/lib/editorial-contract.mjs";

export async function POST(request: Request) {
  const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0].trim()
    || new URL(request.url).protocol.slice(0, -1);
  if (!sameEditorialOrigin(request.headers.get("origin"), request.headers.get("host"), protocol + ":"))
    return new Response(null, { status: 403 });
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
