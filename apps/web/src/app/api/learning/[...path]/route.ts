import { NextResponse } from "next/server";
import { forwardQuiz } from "@/lib/quiz-proxy";

export const runtime = "nodejs";
type Context = { params: Promise<{ path: string[] }> };
async function handler(request: Request, context: Context) {
  const { path } = await context.params;
  const tail = path.join("/");
  const id = "[0-9a-f-]{36}";
  const valid = request.method === "GET"
    ? tail === "active" || new RegExp(`^sessions/${id}$`, "i").test(tail)
    : tail === "start" || new RegExp(`^sessions/${id}/actions$`, "i").test(tail);
  if (!valid) return NextResponse.json({ message: "Halaman belajar tidak ditemukan." }, { status: 404 });
  let body: string | undefined;
  if (request.method === "POST") {
    try {
      const incoming: unknown = await request.json();
      if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) throw new Error();
      body = JSON.stringify(incoming);
    } catch {
      return NextResponse.json({ message: "Tindakan belajar belum dapat dibaca." }, { status: 400 });
    }
  }
  return forwardQuiz(`/learning/${tail}`, { method: request.method, body });
}
export const GET = handler;
export const POST = handler;
