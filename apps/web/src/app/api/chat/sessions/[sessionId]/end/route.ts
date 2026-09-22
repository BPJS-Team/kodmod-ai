import { forwardChat } from "@/lib/chat-proxy";

export const runtime = "nodejs";

type Context = { params: Promise<{ sessionId: string }> };

export async function POST(_request: Request, context: Context) {
  const { sessionId } = await context.params;
  return forwardChat(`/chat/sessions/${encodeURIComponent(sessionId)}/end`, {
    method: "POST",
  });
}
