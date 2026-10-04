import "server-only";

/** Runtime server policy; browser form fields never participate in this choice. */
export function sessionCookieSecure(): boolean {
  const override = process.env.SESSION_COOKIE_SECURE?.trim().toLowerCase();
  if (override === "true") return true;
  if (override === "false") return false;
  return process.env.NODE_ENV === "production";
}
