import { forwardQuiz } from "@/lib/quiz-proxy";
export const runtime = "nodejs";
export async function GET() { return forwardQuiz("/quiz/active"); }
