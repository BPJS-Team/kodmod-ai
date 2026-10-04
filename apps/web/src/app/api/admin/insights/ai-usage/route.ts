import { forwardAdmin } from "@/lib/admin-proxy";
import type { AdminAiUsage } from "@/lib/admin-insights-types";

export const runtime = "nodejs";

export async function GET() {
  return forwardAdmin<AdminAiUsage>("/admin/insights/ai-usage");
}
