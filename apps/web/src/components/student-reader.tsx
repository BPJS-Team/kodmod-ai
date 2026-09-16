"use client";
import { useState } from "react";
import { Bookmark, CheckCircle2 } from "lucide-react";
import { ActionFeedback, useConfirmedAction } from "./action-feedback";
import { saveReadingProgress } from "@/app/student-actions";
import type { Material } from "@/lib/class-types";

function ProgressButton({
  classId,
  materialId,
  field,
  active,
}: {
  classId: string;
  materialId: string;
  field: "completed" | "bookmarked";
  active: boolean;
}) {
  const completion = field === "completed";
  const label = completion
    ? active
      ? "Batalkan tanda selesai"
      : "Tandai sudah dipelajari"
    : active
      ? "Hapus bookmark"
      : "Simpan bookmark";
  const [state, action, pending] = useConfirmedAction(
    saveReadingProgress.bind(null, classId, materialId),
    {
      title: `${label}?`,
      text: completion
        ? "Penanda ini membantu Anda mengatur bacaan. Ini bukan nilai atau penilaian penguasaan materi."
        : active
          ? "Materi tetap tersedia di pustaka selama Anda memiliki akses."
          : "Materi akan mudah ditemukan melalui filter Bookmark di pustaka Anda.",
      confirmText: "Ya, simpan",
      destructive: active,
    },
  );
  const Icon = completion ? CheckCircle2 : Bookmark;
  return (
    <form action={action}>
      <input type="hidden" name="field" value={field} />
      <input type="hidden" name="value" value={String(!active)} />
      <button
        className={`button ${completion ? "primary" : "secondary"}`}
        disabled={pending}
      >
        <Icon size={18} aria-hidden="true" />
        {pending ? "Menyimpan…" : label}
      </button>
      <ActionFeedback state={state} />
    </form>
  );
}

export function StudentReader({
  classId,
  material,
}: {
  classId: string;
  material: Material;
}) {
  const [size, setSize] = useState("20");
  const [contrast, setContrast] = useState(false);
  return (
    <div className="student-reader">
      <section className="panel reader-controls" aria-label="Pengaturan bacaan">
        <div>
          <strong>Nyaman dibaca, sesuai kebutuhanmu.</strong>
          <p>
            Atur tampilan untuk bacaan ini. Tidak ada suara yang diputar
            otomatis.
          </p>
        </div>
        <label className="field">
          Ukuran teks
          <select value={size} onChange={(e) => setSize(e.target.value)}>
            <option value="18">Standar</option>
            <option value="20">Besar</option>
            <option value="24">Lebih besar</option>
            <option value="28">Sangat besar</option>
          </select>
        </label>
        <label className="reader-contrast">
          <input
            type="checkbox"
            checked={contrast}
            onChange={(e) => setContrast(e.target.checked)}
          />
          Kontras tinggi
        </label>
      </section>
      <div className="reader-status" role="status">
        {material.progress?.completed
          ? "Sudah Anda tandai dipelajari"
          : "Belum ditandai selesai"}
        {material.progress?.bookmarked ? " · Tersimpan di bookmark" : ""}
      </div>
      <article
        className={`panel material-reader ${contrast ? "reader-high-contrast" : ""}`}
        aria-label="Isi materi"
        style={{ fontSize: `${size}px` }}
      >
        {material.content}
      </article>
      <section className="panel reader-finish" aria-label="Progres bacaan">
        <div>
          <h2>Satu materi, satu langkah baru.</h2>
          <p>
            Tandai setelah Anda selesai mempelajari materi ini. Anda bisa
            membacanya kembali kapan saja selama masih memiliki akses.
          </p>
        </div>
        <div className="reader-actions">
          <ProgressButton
            classId={classId}
            materialId={material.id}
            field="completed"
            active={!!material.progress?.completed}
          />
          <ProgressButton
            classId={classId}
            materialId={material.id}
            field="bookmarked"
            active={!!material.progress?.bookmarked}
          />
        </div>
      </section>
    </div>
  );
}
