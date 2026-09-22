import { StudentTutor } from "@/components/student-tutor";
import { Heading } from "@/components/ui";
import type { ChatSessionSummary } from "@/lib/chat-types";
import { requireSession } from "@/lib/session";
import { backend } from "@/lib/server-api";

export default async function StudentTutorPage() {
  const { token } = await requireSession("student");
  const sessions = await backend<ChatSessionSummary[]>(
    "/chat/sessions?limit=50",
    token,
  );

  return (
    <>
      <Heading
        title="Tutor KODMOD"
        description="Tanyakan materi, minta contoh, dan susun langkah belajar yang lebih mudah dipahami."
      />
      <StudentTutor initialSessions={sessions} />
    </>
  );
}
