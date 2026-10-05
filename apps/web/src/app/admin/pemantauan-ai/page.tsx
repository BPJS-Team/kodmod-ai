import { requireSession } from "@/lib/session";
import { backend } from "@/lib/server-api";
import type { AdminAiUsage } from "@/lib/admin-insights-types";
import { AdminAiMonitor } from "@/components/admin-ai-monitor";

export default async function AdminAiMonitorPage() {
  const { token } = await requireSession("admin");
  const data = await backend<AdminAiUsage>("/admin/insights/ai-usage", token);

  return <AdminAiMonitor initialData={data} />;
}
