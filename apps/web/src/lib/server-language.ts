import "server-only";
import { cookies } from "next/headers";
import { LANGUAGE_COOKIE, validLanguage, translate } from "./i18n.mjs";

export async function getServerI18n() {
  const value = (await cookies()).get(LANGUAGE_COOKIE)?.value;
  const language = validLanguage(value) ? value : "id";
  return { language, t: (text: string, values?: Record<string, string | number>) => translate(text, language, values) };
}
