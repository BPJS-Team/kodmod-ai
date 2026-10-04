import { forwardAdmin } from "@/lib/admin-proxy";
import type { AdminAiUsage } from "@/lib/admin-insights-types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const incoming = new URL(request.url).searchParams, query = new URLSearchParams();
  for (const name of ["days", "page", "limit", "provider", "status", "search"]) {
    const value = incoming.get(name);
    if (value !== null) query.set(name, value.slice(0, name === "search" ? 121 : 40));
  }
  return forwardAdmin<AdminAiUsage>(`/admin/insights/ai-usage?${query}`);
}
