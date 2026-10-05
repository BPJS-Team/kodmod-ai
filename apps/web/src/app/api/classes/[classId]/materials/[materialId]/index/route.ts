import { NextResponse } from "next/server";
import { forwardMaterial, teacherMaterialSession } from "@/lib/material-proxy";
export const runtime = "nodejs";
export async function POST(_request: Request, { params }: { params: Promise<{ classId: string; materialId: string }> }) {
  const current = await teacherMaterialSession();
  if (current instanceof NextResponse) return current;
  const { classId, materialId } = await params;
  if (![classId, materialId].every((id) => /^[0-9a-f-]{36}$/i.test(id))) return NextResponse.json({ message: "Materi tidak valid." }, { status: 400 });
  return forwardMaterial(current, `/classes/${classId}/materials/${materialId}/index`);
}
