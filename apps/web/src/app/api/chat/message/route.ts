import { NextResponse } from "next/server";
import { forwardChat } from "@/lib/chat-proxy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Pertanyaan belum dapat dibaca." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ message: "Pertanyaan belum dapat dibaca." }, { status: 400 });
  }
  const incoming = body as Record<string, unknown>;
  const text = typeof incoming.text === "string" ? incoming.text.trim() : "";
  if (!text || text.length > 4_000) {
    return NextResponse.json(
      { message: "Pertanyaan harus berisi 1 sampai 4.000 karakter." },
      { status: 400 },
    );
  }

  const payload: Record<string, string> = { text };
  if (typeof incoming.session_id === "string" && incoming.session_id.trim()) {
    payload.session_id = incoming.session_id.trim();
  }
  if (typeof incoming.subject_id === "string" && incoming.subject_id.trim()) {
    payload.subject_id = incoming.subject_id.trim();
  }
  return forwardChat("/chat/message", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
