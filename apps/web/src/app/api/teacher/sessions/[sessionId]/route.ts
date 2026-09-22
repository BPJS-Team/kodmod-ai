import { forwardTeacher } from "@/lib/teacher-proxy";
import type { TeacherTranscript } from "@/lib/teacher-types";

export const runtime = "nodejs";

type Context = { params: Promise<{ sessionId: string }> };

export async function GET(_request: Request, context: Context) {
  const { sessionId } = await context.params;
  return forwardTeacher<TeacherTranscript>(
    `/teacher/sessions/${encodeURIComponent(sessionId)}`,
  );
}
