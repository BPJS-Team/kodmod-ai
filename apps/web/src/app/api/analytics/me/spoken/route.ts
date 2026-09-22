import { forwardStudentAnalytics } from "@/lib/analytics-proxy";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return forwardStudentAnalytics(request, true);
}
