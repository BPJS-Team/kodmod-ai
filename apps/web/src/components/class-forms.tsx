"use client";
import { useState } from "react";
import { createClass, changeClass, saveMaterial } from "@/app/class-actions";
import { ActionFeedback, useConfirmedAction } from "./action-feedback";
import type { Material } from "@/lib/class-types";
import { notifyResult } from "@/lib/dialogs";

export function ClassForm() {
  const [values, setValues] = useState({
    name: "",
    subject: "",
    description: "",
  });
  const [state, action, pending] = useConfirmedAction(createClass, {
    title: "Buat kelas baru?",
    text: "Kelas akan tersedia untuk Anda. Siswa dapat mengakses setelah ditambahkan sebagai anggota.",
    confirmText: "Ya, buat kelas",
  });
  return (
    <form
      action={action}
      onReset={(e) => e.preventDefault()}
      className="panel form-panel form-stack"
    >
      <ActionFeedback state={state} />
      <label className="field">
        Nama kelas
        <input
          required
          name="name"
          maxLength={120}
          placeholder="Contoh: Matematika • Kelas 8A"
          value={values.name}
          onChange={(e) => setValues({ ...values, name: e.target.value })}
        />
      </label>
      <label className="field">
        Mata pelajaran
        <input
          required
          name="subject"
          maxLength={120}
          placeholder="Contoh: Matematika"
          value={values.subject}
          onChange={(e) => setValues({ ...values, subject: e.target.value })}
        />
      </label>
      <label className="field">
        Tentang kelas
        <textarea
          name="description"
          rows={4}
          maxLength={2000}
          placeholder="Apa yang akan dipelajari di kelas ini?"
          value={values.description}
          onChange={(e) =>
            setValues({ ...values, description: e.target.value })
          }
        />
      </label>
      <button className="button primary" disabled={pending}>
        {pending ? "Memproses…" : "Buat kelas"}
      </button>
    </form>
  );
}

export function ClassAction({
  classId,
  mode,
  studentId,
  name,
}: {
  classId: string;
  mode: "add-member" | "remove-member" | "archive" | "restore";
  studentId?: string;
  name?: string;
}) {
  const [username, setUsername] = useState("");
  const labels = {
    "add-member": "Tambahkan siswa",
    "remove-member": "Keluarkan",
    archive: "Arsipkan kelas",
    restore: "Aktifkan kembali",
  };
  const explanations = {
    "add-member": `Siswa @${username} akan mendapat akses ke seluruh materi yang diterbitkan di kelas ini.`,
    "remove-member": `${name || "Siswa"} akan kehilangan akses ke kelas dan seluruh materinya.`,
    archive:
      "Kelas disimpan sebagai arsip dan tidak dapat diakses siswa. Anda bisa mengaktifkannya kembali.",
    restore:
      "Seluruh anggota kelas kembali dapat membaca materi yang diterbitkan.",
  };
  const [state, action, pending] = useConfirmedAction(
    changeClass.bind(null, classId),
    {
      title: `${labels[mode]}?`,
      text: explanations[mode],
      destructive: mode === "remove-member" || mode === "archive",
    },
  );
  return (
    <form
      action={action}
      onReset={(e) => e.preventDefault()}
      className="class-action"
    >
      <input type="hidden" name="mode" value={mode} />
      {studentId && <input type="hidden" name="studentId" value={studentId} />}
      {mode === "add-member" && (
        <label className="field">
          Username siswa
          <input
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username akun yang sudah terdaftar"
            required
            minLength={3}
            maxLength={64}
            autoCapitalize="none"
          />
        </label>
      )}
      <button
        disabled={pending}
        className={`button ${mode === "add-member" || mode === "restore" ? "primary" : "secondary"}`}
        aria-label={mode === "remove-member" ? `Keluarkan ${name}` : undefined}
      >
        {pending ? "Memproses…" : labels[mode]}
      </button>
      <ActionFeedback state={state} />
    </form>
  );
}

export function MaterialForm({
  classId,
  material,
}: {
  classId: string;
  material?: Material;
}) {
  const [title, setTitle] = useState(material?.title || "");
  const [content, setContent] = useState(material?.content || "");
  const [published, setPublished] = useState(material?.published || false);
  const [importing, setImporting] = useState(false);
  const [state, action, pending] = useConfirmedAction(
    saveMaterial.bind(null, classId, material?.id || null),
    {
      title: published
        ? "Terbitkan perubahan materi?"
        : "Simpan sebagai draft?",
      text: published
        ? "Semua siswa anggota kelas dapat membaca materi ini setelah disimpan."
        : "Materi ini hanya dapat dibaca guru. Siswa tidak akan melihatnya sampai diterbitkan.",
      confirmText: "Ya, simpan materi",
    },
  );
  return (
    <form
      action={action}
      onReset={(e) => e.preventDefault()}
      className="panel form-panel form-stack"
    >
      <ActionFeedback state={state} />
      <label className="field">
        Judul materi
        <input
          required
          maxLength={200}
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Contoh: Mengenal persamaan linear"
        />
      </label>
      <label className="field">
        Impor teks (opsional)
        <input
          type="file"
          accept=".txt,text/plain"
          disabled={pending || importing}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setImporting(true);
            try {
              if (
                !file.name.toLowerCase().endsWith(".txt") ||
                file.size > 400000
              )
                throw new Error("Gunakan berkas .txt UTF-8, maksimal 400 KB.");
              const text = new TextDecoder("utf-8", { fatal: true }).decode(
                await file.arrayBuffer(),
              );
              if (!text.trim() || text.length > 100000 || text.includes("\0"))
                throw new Error(
                  "Isi berkas harus berupa teks, maksimal 100.000 karakter.",
                );
              const { confirmAction } = await import("@/lib/dialogs");
              if (
                await confirmAction({
                  title: "Gunakan isi berkas?",
                  text: "Isi materi di editor akan diganti dengan teks dari berkas ini. Perubahan baru tersimpan setelah Anda menekan Simpan materi.",
                })
              )
                setContent(text);
            } catch (error) {
              await notifyResult(
                error instanceof Error
                  ? error.message
                  : "Berkas tidak dapat dibaca.",
                true,
              );
            } finally {
              setImporting(false);
            }
          }}
        />
        <small>
          Teks berkas masuk ke editor. PDF dan dokumen lainnya belum didukung.
        </small>
      </label>
      <label className="field">
        Isi materi
        <textarea
          className="material-editor"
          required
          maxLength={100000}
          name="content"
          rows={18}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Tulis penjelasan, contoh, dan petunjuk belajar di sini…"
        />
        <small>
          {content.length.toLocaleString("id-ID")} / 100.000 karakter
        </small>
      </label>
      <label className="field">
        Visibilitas
        <select
          name="published"
          value={published ? "yes" : "no"}
          onChange={(e) => setPublished(e.target.value === "yes")}
        >
          <option value="no">Draft • hanya guru</option>
          <option value="yes">Terbit • anggota kelas</option>
        </select>
      </label>
      <button className="button primary" disabled={pending || importing}>
        {pending ? "Menyimpan…" : "Simpan materi"}
      </button>
    </form>
  );
}
