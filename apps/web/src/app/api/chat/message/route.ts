import { NextResponse } from "next/server";
import { forwardChat } from "@/lib/chat-proxy";
import { chatMessagePayload } from "@/lib/material-flow.mjs";

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
  let payload: Record<string, string>;
  try {
    payload = chatMessagePayload(body);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Pertanyaan belum sesuai." }, { status: 400 });
  }
  return forwardChat("/chat/message", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
