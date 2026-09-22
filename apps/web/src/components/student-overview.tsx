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
          <BookOpen size={18} aria-hidden="true" />
          Perjalanan bacaanmu
        </span>
        <h2>
          {done} dari {materials.length} materi ditandai selesai
        </h2>
        <progress
          value={done}
          max={materials.length || 1}
          aria-label={`${done} dari ${materials.length} materi ditandai selesai`}
        />
        <p>
          Penanda pribadi untuk mengatur belajar, bukan nilai penguasaan materi.
        </p>
      </div>
      <div className="student-overview-links">
        {next && (
          <Link
            className="button primary"
            href={`/siswa/kelas/${next.class_id}/materi/${next.id}`}
          >
            Baca: {next.title}
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        )}
        <Link className="button secondary" href="/siswa/materi">
          Buka pustaka materi
        </Link>
        <Link className="button secondary" href="/siswa/tutor">
          <MessageCircle size={18} aria-hidden="true" />
          Tanya tutor AI
        </Link>
        <Link className="button secondary" href="/siswa/latihan">
          <ListChecks size={18} aria-hidden="true" />
          Coba latihan singkat
        </Link>
      </div>
    </section>
  );
}
