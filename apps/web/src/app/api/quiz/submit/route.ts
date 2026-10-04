import { NextResponse } from "next/server";
import { forwardQuiz } from "@/lib/quiz-proxy";
import { parseQuizSubmission } from "@/lib/quiz-submission.mjs";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Jawaban belum dapat dibaca." }, { status: 400 });
  }
  let payload: ReturnType<typeof parseQuizSubmission>;
  try {
    payload = parseQuizSubmission(body);
  } catch (caught) {
    return NextResponse.json(
      { message: caught instanceof Error ? caught.message : "Data jawaban tidak valid." },
      { status: 400 },
    );
  }
  return forwardQuiz("/quiz/submit", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
