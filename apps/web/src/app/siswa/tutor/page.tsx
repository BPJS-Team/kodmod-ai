
import { UiText } from "@/components/language-provider";
import { GuidedTutor } from "@/components/guided-tutor";
import { Heading } from "@/components/ui";
import type { LearningSession } from "@/lib/learning-types";
import { requireSession } from "@/lib/session";
import { backend } from "@/lib/server-api";
import type { StudentMaterial } from "@/lib/class-types";
import { notFound } from "next/navigation";

export default async function StudentTutorPage({ searchParams }: { searchParams: Promise<{ class_id?: string; material_id?: string }> }) {
  const { token } = await requireSession("student");
  const query = await searchParams;
  const [sessions, materials] = await Promise.all([
    backend<LearningSession[]>("/learning/active", token),
    backend<StudentMaterial[]>("/classes/student/materials", token),
  ]);
  const selected = query.material_id ? materials.find((item) => item.id === query.material_id && item.class_id === query.class_id) : undefined;
  if ((query.class_id || query.material_id) && !selected) notFound();

  return (
    <>
      <Heading
        title={<UiText>{"Tutor KODMOD"}</UiText>}
        description={<UiText>{"Pelajari materi bersama Tutor, tanyakan yang belum jelas, lalu coba mini kuis."}</UiText>}
      />
      <GuidedTutor key={`${query.class_id || ""}:${query.material_id || ""}`} initialSessions={sessions} materials={materials} initialMaterialId={selected?.id} />
    </>
  );
}
