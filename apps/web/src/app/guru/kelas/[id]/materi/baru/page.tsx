import Link from "next/link";
import { classroomData } from "@/lib/classrooms";
import type { ClassDetail } from "@/lib/class-types";
import { Heading } from "@/components/ui";
import { MaterialForm } from "@/components/class-forms";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await classroomData<ClassDetail>(
    "teacher",
    `/${encodeURIComponent(id)}`,
  );
  return (
    <>
      <Link className="learning-back" href={`/guru/kelas/${id}`}>
        Kembali ke {row.name}
      </Link>
      <Heading
        title="Bagikan pengetahuan baru."
        description="Tulis materi atau impor teks, lalu tentukan kapan siswa dapat membacanya."
      />
      {row.is_archived ? (
        <p className="info-note">
          Aktifkan kelas kembali untuk menambahkan materi.
        </p>
      ) : (
        <MaterialForm classId={id} />
      )}
    </>
  );
}
