import { forwardAdmin } from "@/lib/admin-proxy";
import type { AdminOverview } from "@/lib/admin-insights-types";

export const runtime = "nodejs";

export async function GET() {
  return forwardAdmin<AdminOverview>("/admin/insights/overview");
}
