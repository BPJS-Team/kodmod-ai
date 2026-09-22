import { forwardTeacher } from "@/lib/teacher-proxy";
import type { TeacherStudentDetail } from "@/lib/teacher-types";

export const runtime = "nodejs";

type Context = { params: Promise<{ studentId: string }> };

export async function GET(request: Request, context: Context) {
  const { studentId } = await context.params;
  const raw = new URL(request.url).searchParams.get("window") || "month";
  const window = ["today", "week", "month", "all"].includes(raw) ? raw : "month";
  return forwardTeacher<TeacherStudentDetail>(
    `/teacher/students/${encodeURIComponent(studentId)}?window=${window}`,
  );
}
