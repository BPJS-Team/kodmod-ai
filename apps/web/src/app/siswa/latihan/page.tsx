
import { UiText } from "@/components/language-provider";
import { StudentQuiz } from "@/components/student-quiz";
import { Heading } from "@/components/ui";
import { requireSession } from "@/lib/session";

export default async function StudentQuizPage() {
  await requireSession("student");
  return (
    <>
      <Heading
        title={<UiText>{"Latihan singkat"}</UiText>}
        description={<UiText>{"Cek pemahamanmu satu soal demi satu soal, dengan umpan balik yang mudah diikuti."}</UiText>}
      />
      <StudentQuiz />
    </>
  );
}
