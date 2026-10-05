import { redirect } from "next/navigation";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string; materialId: string }>;
}) {
  const { id, materialId } = await params;
  redirect(`/siswa/tutor?class_id=${encodeURIComponent(id)}&material_id=${encodeURIComponent(materialId)}`);
}
