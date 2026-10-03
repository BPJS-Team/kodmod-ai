"use client";
import { useState } from "react";
import Link from "next/link";
import { Bookmark, CheckCircle2, MessageCircle } from "lucide-react";
import { ActionFeedback, useConfirmedAction } from "./action-feedback";
import {
  saveReadingProgress,
  saveReadingSettings,
} from "@/app/student-actions";
import {
  readingDefaults,
  type ReadingPreferences,
} from "@/lib/reading-preferences";
import type { Material } from "@/lib/class-types";
import { VoiceControls } from "./voice-controls";

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
  preferences,
}: {
  classId: string;
  material: Material;
  preferences: ReadingPreferences;
}) {
  const [size, setSize] = useState(preferences.size);
  const [contrast, setContrast] = useState(preferences.contrast);
  const [spacing, setSpacing] = useState(preferences.spacing);
  const [settingsState, settingsAction, saving] = useConfirmedAction(
    saveReadingSettings,
    {
      title: "Simpan tampilan bacaan?",
      text: "Ukuran teks, jarak baris, dan kontras akan digunakan untuk materi lain saat akun ini dibuka di browser yang sama.",
      confirmText: "Ya, simpan",
    },
  );
  return (
    <div className="student-reader">
      <form
        action={settingsAction}
        onReset={(e) => e.preventDefault()}
        className="panel reader-controls"
        aria-label="Pengaturan bacaan"
      >
        <div>
          <strong>Nyaman dibaca, sesuai kebutuhanmu.</strong>
          <p>
            Pratinjau langsung di bawah. Simpan untuk memakai tampilan ini pada
            materi lain di browser yang sama.
          </p>
        </div>
        <label className="field">
          Ukuran teks
          <select
            name="size"
            value={size}
            disabled={saving}
            onChange={(e) => setSize(e.target.value)}
          >
            <option value="18">Standar</option>
            <option value="20">Besar</option>
            <option value="24">Lebih besar</option>
            <option value="28">Sangat besar</option>
          </select>
        </label>
        <label className="field">
          Jarak baris
          <select
            name="spacing"
            value={spacing}
            disabled={saving}
            onChange={(e) => setSpacing(e.target.value)}
          >
            <option value="1.65">Rapat</option>
            <option value="1.95">Nyaman</option>
            <option value="2.3">Lega</option>
          </select>
        </label>
        <label className="reader-contrast">
          <input
            type="checkbox"
            name="contrast"
            disabled={saving}
            checked={contrast}
            onChange={(e) => setContrast(e.target.checked)}
          />
          Kontras tinggi
        </label>
        <div className="reader-settings-actions">
          <button className="button primary" disabled={saving}>
            {saving ? "Menyimpan…" : "Simpan tampilan"}
          </button>
          <button
            type="button"
            className="button secondary"
            disabled={saving}
            onClick={() => {
              setSize(readingDefaults.size);
              setSpacing(readingDefaults.spacing);
              setContrast(readingDefaults.contrast);
            }}
          >
            Pratinjau bawaan
          </button>
          <ActionFeedback state={settingsState} />
        </div>
      </form>
      <div className="reader-status" role="status">
        {material.progress?.completed
          ? "Sudah Anda tandai dipelajari"
          : "Belum ditandai selesai"}
        {material.progress?.bookmarked ? " · Tersimpan di bookmark" : ""}
      </div>
      <VoiceControls text={material.content ?? ""} />
      <article
        className={`panel material-reader ${contrast ? "reader-high-contrast" : ""}`}
        aria-label="Isi materi"
        style={{ fontSize: `${size}px`, lineHeight: spacing }}
      >
        {material.content}
      </article>
      <section className="panel reader-tutor" aria-label="Belajar bersama Tutor">
        <div>
          <h2>Ada bagian yang ingin kamu pahami?</h2>
          <p>Bawa materi ini ke Tutor. Kamu bisa meminta penjelasan, contoh, atau latihan singkat berdasarkan bacaan.</p>
          {material.rag_status && material.rag_status !== "ready" && <p role="status">Materi masih disiapkan untuk Tutor. Kamu tetap bisa membaca atau mendengarkannya di sini.</p>}
        </div>
        <Link className="button primary" href={`/siswa/tutor?class_id=${encodeURIComponent(classId)}&material_id=${encodeURIComponent(material.id)}`}><MessageCircle size={18} aria-hidden="true" /> Tanya Tutor tentang materi ini</Link>
      </section>
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
