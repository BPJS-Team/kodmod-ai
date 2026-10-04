import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { MaterialUploadTarget } from "@/components/material-upload-target";
import { UiText } from "@/components/language-provider";
import { Badge, Empty, Heading } from "@/components/ui";
import { requireSession } from "@/lib/session";
import { backend } from "@/lib/server-api";
import type { Classroom, TeacherMaterial } from "@/lib/class-types";
import "@/styles/admin-materials.css";

export default async function Page() {
  const { token } = await requireSession("teacher");
  const [classes, materials] = await Promise.all([
    backend<Classroom[]>("/classes", token), backend<TeacherMaterial[]>("/classes/teacher/materials", token),
  ]);
  return <><Heading title={<UiText>{"Materi saya"}</UiText>} description={<UiText>{"Upload dokumen, tinjau isinya, lalu terbitkan untuk belajar bersama Tutor."}</UiText>} /><MaterialUploadTarget classes={classes} />
    {!classes.length && <p className="info-note"><UiText>{"Buat kelas terlebih dahulu untuk membagikan materi."}</UiText> <Link href="/guru/kelas/baru"><UiText>{"Buat kelas"}</UiText></Link></p>}
    {materials.length ? <div className="admin-material-grid">{materials.map((material) => <article className="panel admin-material-card" key={material.id}><header><BookOpen size={22} aria-hidden="true" /><Badge active={material.published}>{material.published ? <UiText>{"Terbit"}</UiText> : <UiText>{"Draft"}</UiText>}</Badge></header><h2>{material.title}</h2><p>{material.subject} · {material.class_name}</p><div className="admin-material-status"><UiText>{material.rag_status === "ready" && material.content_version === material.indexed_version ? "Siap untuk Tutor" : material.rag_status === "failed" ? "Perlu diproses ulang" : material.published ? "Sedang disiapkan" : "Belum diterbitkan"}</UiText></div><Link href={`/guru/kelas/${material.class_id}/materi/${material.id}`}><UiText>{"Buka materi"}</UiText><ArrowRight size={17} aria-hidden="true" /></Link></article>)}</div> : <section className="panel"><Empty title={<UiText>{"Materi pertama Anda"}</UiText>}><UiText>{"Pilih kelas di atas untuk mengunggah PDF, dokumen, atau menulis materi sendiri."}</UiText></Empty></section>}
  </>;
}
