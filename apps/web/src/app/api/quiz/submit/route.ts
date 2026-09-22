import { NextResponse } from "next/server";
import { forwardQuiz } from "@/lib/quiz-proxy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Jawaban belum dapat dibaca." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ message: "Jawaban belum dapat dibaca." }, { status: 400 });
  }
  const incoming = body as Record<string, unknown>;
  const sessionId = typeof incoming.quiz_session_id === "string" ? incoming.quiz_session_id.trim() : "";
  const questionId = typeof incoming.question_id === "string" ? incoming.question_id.trim() : "";
  const answer = typeof incoming.student_answer === "string" ? incoming.student_answer.trim() : "";
  if (!sessionId || !questionId || !answer || answer.length > 4_000) {
    return NextResponse.json(
      { message: "Jawaban harus diisi sebelum dikirim." },
      { status: 400 },
    );
  }
  const payload: Record<string, string | number> = {
    quiz_session_id: sessionId,
    question_id: questionId,
    student_answer: answer,
  };
  if (typeof incoming.response_latency_ms === "number" && Number.isFinite(incoming.response_latency_ms)) {
    payload.response_latency_ms = Math.max(0, Math.round(incoming.response_latency_ms));
  }
  return forwardQuiz("/quiz/submit", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
