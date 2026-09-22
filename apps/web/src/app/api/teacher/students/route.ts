import { forwardTeacher } from "@/lib/teacher-proxy";
import type { TeacherCohort } from "@/lib/teacher-types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("window") || "week";
  const window = ["today", "week", "month", "all"].includes(raw) ? raw : "week";
  return forwardTeacher<TeacherCohort>(`/teacher/students?window=${window}`);
}
