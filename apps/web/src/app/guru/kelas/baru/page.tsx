
import { UiText } from "@/components/language-provider";
import { Heading } from "@/components/ui";
import { BackToClasses } from "@/components/class-pages";
import { ClassForm } from "@/components/class-forms";
export default function Page() {
  return (
    <>
      <BackToClasses role="teacher" />
      <Heading
        title={<UiText>{"Mulai ruang belajar baru."}</UiText>}
        description={<UiText>{"Beri nama kelas, pilih mata pelajaran, dan ceritakan tujuan belajarnya."}</UiText>}
      />
      <ClassForm />
    </>
  );
}
