import { TeacherAnalytics } from "@/components/teacher-analytics";
import { Heading } from "@/components/ui";
import type { TeacherCohort } from "@/lib/teacher-types";
import { requireSession } from "@/lib/session";
import { backend } from "@/lib/server-api";

export default async function TeacherAnalyticsPage() {
  const { token } = await requireSession("teacher");
  const cohort = await backend<TeacherCohort>("/teacher/students?window=week", token);

  return (
    <>
      <Heading
        title="Analitik siswa"
        description="Pantau pola belajar cohort dan buka detail siswa untuk tindak lanjut yang lebih terarah."
      />
      <TeacherAnalytics initial={cohort} />
    </>
  );
}
