import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminMaterialEditor } from "@/components/admin-material-editor";
import { UiText } from "@/components/language-provider";
import { Heading } from "@/components/ui";
import { requireSession } from "@/lib/session";
import { backend, BackendError } from "@/lib/server-api";
import type { AdminMaterial } from "@/lib/admin-material-types";
import "@/styles/admin-materials.css";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { token } = await requireSession("admin");
  const { id } = await params;
  let material: AdminMaterial;
  try { material = await backend<AdminMaterial>(`/admin/materials/${encodeURIComponent(id)}`, token); }
  catch (caught) { if (caught instanceof BackendError && caught.status === 404) notFound(); throw caught; }
  return <><Link className="learning-back" href="/admin/materi"><ArrowLeft size={16} aria-hidden="true" /><UiText>{"Semua materi"}</UiText></Link><Heading title={material.title} description={`${material.subject} · ${material.class_name} · ${material.teacher_name}`} /><p className="info-note"><UiText>{"Materi ini digunakan sebagai sumber penjelasan Tutor dan soal latihan siswa."}</UiText></p>{material.is_archived && <p className="info-note"><UiText>{"Kelas ini diarsipkan. Materi dapat dibaca, tetapi belum dapat diubah."}</UiText></p>}<AdminMaterialEditor key={`${material.id}:${material.content_version}:${material.published}`} material={material} /></>;
}
