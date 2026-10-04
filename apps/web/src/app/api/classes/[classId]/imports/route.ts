import { NextResponse } from "next/server";
import { teacherMaterialSession, forwardMaterial } from "@/lib/material-proxy";
export const runtime = "nodejs";
export async function GET(_: Request, { params }: { params: Promise<{ classId: string }> }) {
  const current = await teacherMaterialSession();
  if (current instanceof NextResponse) return current;
  const { classId } = await params;
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(classId)) return NextResponse.json({ message: "Kelas tidak valid." }, { status: 400 });
  return forwardMaterial(current, `/classes/${classId}/imports`, undefined, { method: "GET" });
}
