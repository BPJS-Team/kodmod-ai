import { Heading } from "@/components/ui";
import { BackToClasses } from "@/components/class-pages";
import { ClassForm } from "@/components/class-forms";
export default function Page() {
  return (
    <>
      <BackToClasses role="teacher" />
      <Heading
        title="Mulai ruang belajar baru."
        description="Beri nama kelas, pilih mata pelajaran, dan ceritakan tujuan belajarnya."
      />
      <ClassForm />
    </>
  );
}
