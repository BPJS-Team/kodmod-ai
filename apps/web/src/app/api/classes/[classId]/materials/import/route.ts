import { NextResponse } from "next/server";
import { forwardMaterial, teacherMaterialSession } from "@/lib/material-proxy";
import { MATERIAL_UPLOAD_LIMIT, validateMaterialFile } from "@/lib/material-flow.mjs";

export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ classId: string }> }) {
  const current = await teacherMaterialSession();
  if (current instanceof NextResponse) return current;
  const { classId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(classId)) return NextResponse.json({ message: "Kelas tidak valid." }, { status: 400 });
  if (Number(request.headers.get("content-length")) > MATERIAL_UPLOAD_LIMIT + 1024 * 1024) return NextResponse.json({ message: "Ukuran berkas maksimal 25 MB." }, { status: 413 });
  let data: FormData;
  try { data = await request.formData(); } catch { return NextResponse.json({ message: "Berkas belum dapat dibaca." }, { status: 400 }); }
  const file = data.get("file");
  const error = validateMaterialFile(file instanceof File ? file : null);
  if (error || !(file instanceof File)) return NextResponse.json({ message: error || "Pilih berkas materi." }, { status: 400 });
  const payload = new FormData();
  payload.set("file", file);
  return forwardMaterial(current, `/classes/${classId}/materials/import`, payload);
}
