import { forwardTeacher } from "@/lib/teacher-proxy";
import type { TeacherSession } from "@/lib/teacher-types";

export const runtime = "nodejs";

type Context = { params: Promise<{ studentId: string }> };

export async function GET(request: Request, context: Context) {
  const { studentId } = await context.params;
  const rawLimit = Number(new URL(request.url).searchParams.get("limit") || "50");
  const limit = Number.isFinite(rawLimit) ? Math.min(200, Math.max(1, Math.floor(rawLimit))) : 50;
  return forwardTeacher<TeacherSession[]>(
    `/teacher/students/${encodeURIComponent(studentId)}/sessions?limit=${limit}`,
  );
}
