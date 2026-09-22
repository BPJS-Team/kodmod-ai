import { StudentAnalytics } from "@/components/student-analytics";
import { Heading } from "@/components/ui";
import type { StudentAnalytics as StudentAnalyticsData, StudentAnalyticsSpoken } from "@/lib/analytics-types";
import { requireSession } from "@/lib/session";
import { backend } from "@/lib/server-api";

export default async function StudentProgressPage() {
  const { token } = await requireSession("student");
  const [initial, spokenPayload] = await Promise.all([
    backend<StudentAnalyticsData>("/analytics/me?window=week", token),
    backend<StudentAnalyticsSpoken>("/analytics/me/spoken?window=week", token),
  ]);

  return (
    <>
      <Heading
        title="Progres belajar"
        description="Lihat pola belajar, kekuatan, dan langkah berikutnya yang paling membantu untukmu."
      />
      <StudentAnalytics initial={initial} initialSpoken={spokenPayload.spoken} />
    </>
  );
}
