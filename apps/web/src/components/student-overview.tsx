
import { UiText } from "@/components/language-provider";
import Link from "next/link";
import { ArrowUpRight, BookOpen, ListChecks, MessageCircle } from "lucide-react";
import { classroomData } from "@/lib/classrooms";
import type { StudentMaterial } from "@/lib/class-types";
export async function StudentOverview() {
  const materials = await classroomData<StudentMaterial[]>(
    "student",
    "/student/materials",
  );
  const done = materials.filter((m) => m.progress.completed).length;
  const next = materials.find((m) => !m.progress.completed);
  return (
    <section className="panel student-overview" aria-label="Ringkasan bacaan">
      <div>
        <span className="student-overview-label">
          <BookOpen size={18} aria-hidden="true" /><UiText>{"Perjalanan bacaanmu"}</UiText></span>
        <h2>
          {done}<UiText>{" dari "}</UiText>{materials.length}<UiText>{" materi ditandai selesai"}</UiText></h2>
        <progress
          value={done}
          max={materials.length || 1}
          aria-label={`${done} dari ${materials.length} materi ditandai selesai`}
        />
        <p><UiText>{"Penanda pribadi untuk mengatur belajar, bukan nilai penguasaan materi."}</UiText></p>
      </div>
      <div className="student-overview-links">
        {next && (
          <Link
            className="button primary"
            href={`/siswa/kelas/${next.class_id}/materi/${next.id}`}
          ><UiText>{"Baca: "}</UiText>{next.title}
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        )}
        <Link className="button secondary" href="/siswa/materi"><UiText>{"Buka pustaka materi"}</UiText></Link>
        <Link className="button secondary" href="/siswa/tutor">
          <MessageCircle size={18} aria-hidden="true" /><UiText>{"Tanya tutor AI"}</UiText></Link>
        <Link className="button secondary" href="/siswa/latihan">
          <ListChecks size={18} aria-hidden="true" /><UiText>{"Coba latihan singkat"}</UiText></Link>
      </div>
    </section>
  );
}
