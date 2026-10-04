import "server-only";
import { cookies } from "next/headers";
import { DISPLAY_COOKIE, parseDisplaySettings } from "./speech-preferences.mjs";
export async function serverDisplaySettings() {
  try { return parseDisplaySettings(JSON.parse(decodeURIComponent((await cookies()).get(DISPLAY_COOKIE)?.value ?? "{}"))); }
  catch { return parseDisplaySettings(); }
}
