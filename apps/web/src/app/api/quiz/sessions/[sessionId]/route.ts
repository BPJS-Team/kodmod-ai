import { forwardQuiz } from "@/lib/quiz-proxy";
export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await context.params;
  return forwardQuiz(`/quiz/sessions/${encodeURIComponent(sessionId)}`);
}
