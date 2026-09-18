import "server-only";
import { cookies } from "next/headers";
import { requireSession } from "./session";
import { parseReadingPreferences } from "./reading-preferences";

export async function readingSettings() {
  const { user } = await requireSession("student");
  return parseReadingPreferences(
    (await cookies()).get(`kodmod_reading_${user.id}`)?.value,
  );
}
