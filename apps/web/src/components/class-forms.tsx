"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, LoaderCircle, RefreshCw, UploadCloud } from "lucide-react";
import { createClass, changeClass, saveMaterial } from "@/app/class-actions";
import { ActionFeedback, useConfirmedAction } from "./action-feedback";
import type { Material } from "@/lib/class-types";
import { confirmAction, notifyResult } from "@/lib/dialogs";
import { materialTutorStatus, validateMaterialFile } from "@/lib/material-flow.mjs";

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
  const [sourceFilename, setSourceFilename] = useState(material?.source_filename || "");
  const [importNotice, setImportNotice] = useState("");
  const [importError, setImportError] = useState("");
  const [indexing, setIndexing] = useState(false);
  const tutorStatus = material ? materialTutorStatus(material) : null;
  const router = useRouter();
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

  async function importFile(file: File) {
    const validation = validateMaterialFile(file);
    if (validation) {
      setImportError(validation);
      await notifyResult(validation, true);
      return;
    }
    if (!(await confirmAction({ title: "Baca isi dokumen ini?", text: "Dokumen akan dibaca untuk pratinjau. Setelah itu, Anda dapat meninjau dan mengubah teks sebelum menyimpan materi.", confirmText: "Ya, baca dokumen" }))) return;
    setImporting(true);
    setImportError("");
    setImportNotice("");
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch(`/api/classes/${encodeURIComponent(classId)}/materials/import`, { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Dokumen belum dapat dibaca.");
      if (typeof result.content !== "string" || !result.content.trim() || result.content.length > 100000) throw new Error("Teks dokumen harus berisi 1 sampai 100.000 karakter.");
      if (content.trim() && !(await confirmAction({ title: "Ganti isi editor dengan dokumen?", text: "Isi editor saat ini akan diganti dengan hasil pembacaan dokumen. Perubahan baru tersimpan setelah Anda menekan Simpan materi.", confirmText: "Ya, gunakan dokumen" }))) return;
      setContent(result.content);
      if (!title.trim()) setTitle(typeof result.title === "string" ? result.title.slice(0, 200) : file.name.replace(/\.[^.]+$/, ""));
      setSourceFilename(typeof result.filename === "string" ? result.filename : file.name);
      const warnings = Array.isArray(result.warnings) ? result.warnings.filter((item: unknown) => typeof item === "string").join(" ") : "";
      setImportNotice(`Dokumen berhasil dibaca. Tinjau isi dan urutan bacaan sebelum menyimpan.${warnings ? ` ${warnings}` : ""}`);
      await notifyResult("Dokumen siap ditinjau di editor.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Dokumen belum dapat dibaca.";
      setImportError(message);
      await notifyResult(message, true);
    } finally { setImporting(false); }
  }

  async function retryIndex() {
    if (!material?.published || !(await confirmAction({ title: "Siapkan materi untuk Tutor?", text: "Tutor akan memakai isi materi yang terakhir disimpan. Perubahan di editor perlu disimpan terlebih dahulu.", confirmText: "Ya, siapkan materi" }))) return;
    setIndexing(true);
    try {
      const response = await fetch(`/api/classes/${classId}/materials/${material.id}/index`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Materi belum dapat disiapkan.");
      await notifyResult("Materi sedang disiapkan untuk Tutor. Perbarui status untuk melihat hasilnya.");
      router.refresh();
    } catch (error) { await notifyResult(error instanceof Error ? error.message : "Materi belum dapat disiapkan.", true); }
    finally { setIndexing(false); }
  }
  return (
    <form
      action={action}
      onReset={(e) => e.preventDefault()}
      className="panel form-panel form-stack"
    >
      <ActionFeedback state={state} />
      <input type="hidden" name="source_filename" value={sourceFilename} />
      {material && tutorStatus && (
        <section className={`material-ai-status ${material.rag_status === "failed" ? "failed" : ""}`} aria-label="Kesiapan materi untuk Tutor">
          <div>
            <strong>{tutorStatus.heading}</strong>
            <p>{tutorStatus.description}</p>
          </div>
          <div className="material-status-actions">
            <button type="button" className="button secondary" onClick={() => router.refresh()} disabled={pending || importing || indexing}><RefreshCw size={16} aria-hidden="true" /> Perbarui status</button>
            {tutorStatus.actionLabel && <button type="button" className="button primary" onClick={() => void retryIndex()} disabled={pending || importing || indexing}>{indexing ? "Menyiapkan…" : tutorStatus.actionLabel}</button>}
          </div>
        </section>
      )}
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
      <section className="material-import" aria-label="Impor dokumen materi">
        <div className="material-import-heading">
          <span className="material-import-icon" aria-hidden="true"><UploadCloud size={24} /></span>
          <div><h2>Mulai dari dokumen Anda</h2><p>Unggah dokumen, tinjau teksnya, lalu simpan sebagai materi kelas.</p></div>
        </div>
        <label className="field">
        Pilih dokumen materi (opsional)
        <input
          type="file"
          accept=".pdf,.docx,.md,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
          disabled={pending || importing}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void importFile(file);
          }}
        />
        <small>PDF dengan teks, DOCX, Markdown, atau TXT. Maksimal 25 MB. PDF hasil scan perlu diubah menjadi teks terlebih dahulu.</small>
        </label>
        {importing && <p className="material-import-progress" role="status"><LoaderCircle className="spin" size={18} aria-hidden="true" /> Membaca dokumen, mohon tunggu…</p>}
        {sourceFilename && <p className="material-source-file"><FileText size={17} aria-hidden="true" /><span>{sourceFilename}</span></p>}
        {importNotice && <p className="material-import-notice" role="status">{importNotice}</p>}
        {importError && <p className="alert error-message" role="alert">{importError}</p>}
      </section>
      <label className="field">
        Isi materi
        <textarea
          className="material-editor"
          required
          maxLength={100000}
          name="content"
          rows={18}
          value={content}
          disabled={importing || pending}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Tulis penjelasan, contoh, dan petunjuk belajar di sini…"
        />
        <small>
          {content.length.toLocaleString("id-ID")} / 100.000 karakter
        </small>
        <small>Setelah disimpan, isi materi disiapkan untuk Tutor. Hanya materi terbit yang dapat digunakan siswa anggota kelas.</small>
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
