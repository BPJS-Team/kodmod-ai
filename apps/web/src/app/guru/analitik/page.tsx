
import { UiText } from "@/components/language-provider";
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
        title={<UiText>{"Analitik siswa"}</UiText>}
        description={<UiText>{"Pantau pola belajar cohort dan buka detail siswa untuk tindak lanjut yang lebih terarah."}</UiText>}
      />
      <TeacherAnalytics initial={cohort} />
    </>
  );
}
