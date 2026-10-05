
import { UiText } from "@/components/language-provider";
import { AdminInsights } from "@/components/admin-insights";
import { Heading } from "@/components/ui";
import type { AdminActivity, AdminOverview } from "@/lib/admin-insights-types";
import { requireSession } from "@/lib/session";
import { backend } from "@/lib/server-api";

export default async function AdminActivityPage() {
  const { token } = await requireSession("admin");
  const [overview, activity] = await Promise.all([
    backend<AdminOverview>("/admin/insights/overview", token),
    backend<AdminActivity>("/admin/activity?limit=30", token),
  ]);

  return (
    <>
      <Heading
        title={<UiText>{"Aktivitas & layanan"}</UiText>}
        description={<UiText>{"Pantau kesehatan operasional KODMOD dan status provider pendukung."}</UiText>}
      />
      <AdminInsights initialOverview={overview} initialActivity={activity} />
    </>
  );
}
