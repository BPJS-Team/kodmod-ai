import { forwardAdmin } from "@/lib/admin-proxy";
import type { AdminActivity } from "@/lib/admin-insights-types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = Number(url.searchParams.get("limit") || "30");
  const limit = Number.isFinite(raw) ? Math.min(100, Math.max(1, Math.floor(raw))) : 30;
  const category = url.searchParams.get("category");
  const path = category
    ? `/admin/activity?limit=${limit}&category=${encodeURIComponent(category)}`
    : `/admin/activity?limit=${limit}`;
  return forwardAdmin<AdminActivity>(path);
}
