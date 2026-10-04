
import { UiText } from "@/components/language-provider";
import { StudentQuiz } from "@/components/student-quiz";
import { Heading } from "@/components/ui";
import { requireSession } from "@/lib/session";
import { backend } from "@/lib/server-api";
import type { StudentMaterial } from "@/lib/class-types";
import type { QuizRecoveryResponse } from "@/lib/quiz-types";

export default async function StudentQuizPage() {
  const { token } = await requireSession("student");
  const [materials, active] = await Promise.all([
    backend<StudentMaterial[]>("/classes/student/materials", token),
    backend<QuizRecoveryResponse[]>("/quiz/active", token),
  ]);
  return (
    <>
      <Heading
        title={<UiText>{"Asesmen mandiri"}</UiText>}
        description={<UiText>{"Cek pemahamanmu satu soal demi satu soal, dengan umpan balik yang mudah diikuti."}</UiText>}
      />
      <StudentQuiz materials={materials} initialSession={active[0] ?? null} />
    </>
  );
}
