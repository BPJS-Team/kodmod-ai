import { StudentQuiz } from "@/components/student-quiz";
import { Heading } from "@/components/ui";
import { requireSession } from "@/lib/session";

export default async function StudentQuizPage() {
  await requireSession("student");
  return (
    <>
      <Heading
        title="Latihan singkat"
        description="Cek pemahamanmu satu soal demi satu soal, dengan umpan balik yang mudah diikuti."
      />
      <StudentQuiz />
    </>
  );
}
