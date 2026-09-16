import { Heading } from "@/components/ui";
import { StudentLibrary } from "@/components/student-library";
import { classroomData } from "@/lib/classrooms";
import type { StudentMaterial } from "@/lib/class-types";
export default async function Page() {
  const materials = await classroomData<StudentMaterial[]>(
    "student",
    "/student/materials",
  );
  return (
    <>
      <Heading
        title="Pustaka materi"
        description="Temukan bacaan dari kelas Anda, simpan yang menarik, dan pelajari sesuai ritme Anda."
      />
      <StudentLibrary materials={materials} />
    </>
  );
}
