import { forwardChat } from "@/lib/chat-proxy";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawLimit = Number(url.searchParams.get("limit") || "50");
  const limit = Number.isFinite(rawLimit)
    ? Math.min(200, Math.max(1, Math.floor(rawLimit)))
    : 50;
  return forwardChat(`/chat/sessions?limit=${limit}`);
}
