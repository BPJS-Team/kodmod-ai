import { forwardAdmin } from "@/lib/admin-proxy";
import type { AdminActivity } from "@/lib/admin-insights-types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const raw = Number(new URL(request.url).searchParams.get("limit") || "30");
  const limit = Number.isFinite(raw) ? Math.min(100, Math.max(1, Math.floor(raw))) : 30;
  return forwardAdmin<AdminActivity>(`/admin/activity?limit=${limit}`);
}
