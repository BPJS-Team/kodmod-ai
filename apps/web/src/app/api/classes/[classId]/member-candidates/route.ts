import { NextResponse } from "next/server";
import { teacherMaterialSession, forwardMaterial } from "@/lib/material-proxy";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ classId: string }> }) {
  const current = await teacherMaterialSession();
  if (current instanceof NextResponse) return current;
  const { classId } = await params;
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(classId)) return NextResponse.json({ message: "Kelas tidak valid." }, { status: 400 });
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 64);
  return forwardMaterial(current, `/classes/${classId}/member-candidates?q=${encodeURIComponent(q)}`, undefined, { method: "GET" });
}
