
import { UiText } from "@/components/language-provider";
import { TeacherStudentDetailView } from "@/components/teacher-student-detail";
import { Heading } from "@/components/ui";
import type { TeacherSession, TeacherStudentDetail } from "@/lib/teacher-types";
import { requireSession } from "@/lib/session";
import { backend } from "@/lib/server-api";

type Context = { params: Promise<{ id: string }> };

export default async function TeacherStudentPage({ params }: Context) {
  const { token } = await requireSession("teacher");
  const { id } = await params;
  const encoded = encodeURIComponent(id);
  const [detail, sessions] = await Promise.all([
    backend<TeacherStudentDetail>(`/teacher/students/${encoded}?window=month`, token),
    backend<TeacherSession[]>(`/teacher/students/${encoded}/sessions?limit=50`, token),
  ]);

  return (
    <>
      <Heading
        title={<UiText>{"Detail siswa"}</UiText>}
        description={<UiText>{"Baca sinyal belajar dan transcript tutor sebagai bahan pendampingan."}</UiText>}
      />
      <TeacherStudentDetailView initial={detail} initialSessions={sessions} />
    </>
  );
}
