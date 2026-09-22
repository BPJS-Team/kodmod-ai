import { NextResponse } from "next/server";
import { forwardQuiz } from "@/lib/quiz-proxy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Pengaturan latihan belum dapat dibaca." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ message: "Pengaturan latihan belum dapat dibaca." }, { status: 400 });
  }
  const incoming = body as Record<string, unknown>;
  const nQuestions = Number(incoming.n_questions ?? 5);
  if (!Number.isInteger(nQuestions) || nQuestions < 1 || nQuestions > 20) {
    return NextResponse.json({ message: "Pilih 1 sampai 20 soal." }, { status: 400 });
  }
  const payload: Record<string, string | number> = { n_questions: nQuestions };
  if (typeof incoming.concept_id === "string" && incoming.concept_id.trim()) {
    payload.concept_id = incoming.concept_id.trim();
  }
  if (["easy", "medium", "hard"].includes(String(incoming.difficulty))) {
    payload.difficulty = String(incoming.difficulty);
  }
  return forwardQuiz("/quiz/start", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
