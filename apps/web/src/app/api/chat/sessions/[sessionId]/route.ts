import { forwardChat } from "@/lib/chat-proxy";

export const runtime = "nodejs";

type Context = { params: Promise<{ sessionId: string }> };

export async function GET(_request: Request, context: Context) {
  const { sessionId } = await context.params;
  return forwardChat(`/chat/sessions/${encodeURIComponent(sessionId)}`);
}

export async function DELETE(_request: Request, context: Context) {
  const { sessionId } = await context.params;
  return forwardChat(`/chat/sessions/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
  });
}
