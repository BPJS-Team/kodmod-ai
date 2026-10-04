
import { UiText } from "@/components/language-provider";
export default function Loading() {
  return (
    <div className="panel learning-section" role="status">
      <h2><UiText>{"Menyiapkan ruang belajar…"}</UiText></h2>
      <p><UiText>{"Kelas dan materi Anda sedang dimuat."}</UiText></p>
    </div>
  );
}
