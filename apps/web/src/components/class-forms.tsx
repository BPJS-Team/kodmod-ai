"use client";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

import { UiText, useI18n } from "@/components/language-provider";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, LoaderCircle, RefreshCw, UploadCloud } from "lucide-react";
import { createClass, changeClass, saveMaterial } from "@/app/class-actions";
import { ActionFeedback, useConfirmedAction } from "./action-feedback";
import type { Material } from "@/lib/class-types";
import { confirmAction, notifyResult } from "@/lib/dialogs";
import { materialTutorStatus, validateMaterialFile, parseMaterialPageRange, type MaterialSection } from "@/lib/material-flow.mjs";
import type { CurriculumSubject } from "@/lib/concept-types";
import type { MaterialImportRecord } from "@/lib/import-types";
import { MaterialImportHistory } from "./material-import-history";

export function ClassForm({ subjects = [] }: { subjects?: CurriculumSubject[] }) {
  const { t } = useI18n();
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
      <label className="field"><UiText>{"Nama kelas"}</UiText><Input
          required
          name="name"
          maxLength={120}
          placeholder={t("Contoh: Matematika • Kelas 8A")}
          value={values.name}
          onChange={(e) => setValues({ ...values, name: e.target.value })}
        />
      </label>
      <label className="field"><UiText>{"Mata pelajaran"}</UiText><Input
          required
          name="subject"
          maxLength={120}
          placeholder={t("Contoh: Matematika")}
          value={values.subject}
          onChange={(e) => setValues({ ...values, subject: e.target.value })}
        />
      </label>
      <label className="field"><UiText>{"Hubungkan mata pelajaran"}</UiText><NativeSelect name="subject_id" onChange={event => {
        const subject = subjects.find(row => row.id === event.target.value);
        if (subject) setValues(previous => ({ ...previous, subject: subject.name }));
      }}><option value=""><UiText>{"Pilih nanti"}</UiText></option>{subjects.map(subject => <option value={subject.id} key={subject.id}>{subject.name}</option>)}</NativeSelect></label>
      <label className="field"><UiText>{"Tentang kelas"}</UiText><Textarea
          name="description"
          rows={4}
          maxLength={2000}
          placeholder={t("Apa yang akan dipelajari di kelas ini?")}
          value={values.description}
          onChange={(e) =>
            setValues({ ...values, description: e.target.value })
          }
        />
      </label>
      <button className="button primary" disabled={pending}>
        {pending ? <UiText>{"Memproses…"}</UiText> : <UiText>{"Buat kelas"}</UiText>}
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
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const labels = {
    "add-member": "Tambahkan siswa",
    "remove-member": "Keluarkan",
    archive: "Arsipkan kelas",
    restore: "Aktifkan kembali",
  };
  const explanations = {
    "add-member": t("Siswa @{username} akan mendapat akses ke seluruh materi yang diterbitkan di kelas ini.", { username }),
    "remove-member": t("{name} akan kehilangan akses ke kelas dan seluruh materinya.", { name: name || t("Siswa") }),
    archive:
      "Kelas disimpan sebagai arsip dan tidak dapat diakses siswa. Anda bisa mengaktifkannya kembali.",
    restore:
      "Seluruh anggota kelas kembali dapat membaca materi yang diterbitkan.",
  };
  const [state, action, pending] = useConfirmedAction(
    changeClass.bind(null, classId),
    {
      title: `${t(labels[mode])}?`,
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
        <label className="field"><UiText>{"Username siswa"}</UiText><Input
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t("Username akun yang sudah terdaftar")}
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
        aria-label={mode === "remove-member" ? t("Keluarkan {name}", { name: name || t("Siswa") }) : undefined}
      >
        {pending ? <UiText>{"Memproses…"}</UiText> : t(labels[mode])}
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
  const { t } = useI18n();
  const [title, setTitle] = useState(material?.title || "");
  const [content, setContent] = useState(material?.content || "");
  const [published, setPublished] = useState(material?.published || false);
  const [importing, setImporting] = useState(false);
  const [sourceFilename, setSourceFilename] = useState(material?.source_filename || "");
  const [sourceImportId, setSourceImportId] = useState(material?.source_import_id || "");
  const [importRefresh, setImportRefresh] = useState(0);
  const [importNotice, setImportNotice] = useState("");
  const [importError, setImportError] = useState("");
  const [book, setBook] = useState<{ importId: string; filename: string; totalPages: number; sections: MaterialSection[] } | null>(null);
  const [pageRange, setPageRange] = useState({ first: "1", last: "30" });
  const [sectionChoice, setSectionChoice] = useState("");
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

  async function importFile(file: File, selection?: { first: number; last: number }) {
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
      if (selection) {
        body.set("first_page", String(selection.first)); body.set("last_page", String(selection.last));
      }
      const response = await fetch(`/api/classes/${encodeURIComponent(classId)}/materials/import`, { method: "POST", body });
      const receipt = await response.json();
      if (!response.ok) throw new Error(receipt.message || "Dokumen belum dapat dibaca.");
      setImportRefresh(value => value + 1);
      await waitForPreview(receipt);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Dokumen belum dapat dibaca.";
      setImportError(message);
      await notifyResult(message, true);
    } finally { setImporting(false); }
  }

  async function waitForPreview(receipt: MaterialImportRecord) {
    let record = receipt;
    for (let attempt = 0; attempt < 8 && record.state !== "complete"; attempt++) {
      if (record.state === "failed") throw new Error("Dokumen belum dapat dibaca. Gunakan Proses ulang pada dokumen tersimpan.");
      await new Promise(resolve => setTimeout(resolve, 1000));
      const response = await fetch(`/api/classes/${classId}/imports/${record.import_id}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Status dokumen belum dapat dibuka.");
      record = await response.json();
    }
    setImportRefresh(value => value + 1);
    if (record.state === "complete") await applyPreview(record);
    else setImportNotice(t("Dokumen sedang diproses. Anda boleh meninggalkan halaman ini dan melanjutkan dari Dokumen tersimpan."));
  }

  async function applyPreview(record: MaterialImportRecord) {
      const result = record.preview;
      if (!result) throw new Error("Dokumen belum dapat dibaca.");
      const selection = result.page_range;
      if (result.preview_type === "book") {
        const sections = Array.isArray(result.sections) ? result.sections as MaterialSection[] : [];
        setBook({ importId: record.import_id, filename: record.filename, totalPages: result.total_pages ?? 0, sections });
        const first = sections[0]?.first ?? 1, last = Math.min(sections[0]?.last ?? 30, first + 149);
        setPageRange({ first: String(first), last: String(last) }); setSectionChoice(sections.length ? "0" : "");
        setImportNotice(t("Pilih bab atau halaman yang ingin dijadikan materi. Isi editor belum berubah."));
        return;
      }
      if (typeof result.content !== "string" || !result.content.trim() || result.content.length > 100000) throw new Error("Teks dokumen harus berisi 1 sampai 100.000 karakter.");
      if (content.trim() && !(await confirmAction({ title: "Ganti isi editor dengan dokumen?", text: "Isi editor saat ini akan diganti dengan hasil pembacaan dokumen. Perubahan baru tersimpan setelah Anda menekan Simpan materi.", confirmText: "Ya, gunakan dokumen" }))) return;
      setContent(result.content);
      setSourceImportId(record.import_id);
      if (!title.trim()) {
        const chapter = selection && book?.sections[Number(sectionChoice)];
        setTitle(chapter && chapter.first === selection.first && chapter.last === selection.last ? chapter.title
          : `${typeof result.title === "string" ? result.title.slice(0, 170) : record.filename.replace(/\.[^.]+$/, "")}${selection ? ` · ${t("Halaman {first}–{last}", selection)}` : ""}`);
      }
      const source = typeof result.filename === "string" ? result.filename : record.filename;
      setSourceFilename(`${source}${selection ? ` · ${t("Halaman {first}–{last}", selection)}` : ""}`.slice(0, 300));
      if (!selection) setBook(null);
      const warnings = Array.isArray(result.warnings) ? result.warnings.filter((item: unknown): item is string => typeof item === "string").map(item => t(item)).join(" ") : "";
      setImportNotice(`${t("Dokumen berhasil dibaca. Tinjau isi dan urutan bacaan sebelum menyimpan.")}${warnings ? ` ${warnings}` : ""}`);
      await notifyResult("Dokumen siap ditinjau di editor.");
  }

  async function importPages() {
    if (!book) return;
    try {
      const selection = parseMaterialPageRange(pageRange.first, pageRange.last);
      if (!selection || selection.last > book.totalPages) throw new Error(t("Pilihan halaman tidak valid."));
      if (!(await confirmAction({ title: "Baca halaman terpilih?", text: "Halaman ini akan dibaca dari dokumen yang tersimpan.", confirmText: "Baca halaman" }))) return;
      setImporting(true);
      const response = await fetch(`/api/classes/${classId}/imports/${book.importId}/pages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ first_page: selection.first, last_page: selection.last }) });
      const receipt = await response.json();
      if (!response.ok) throw new Error(receipt.message || "Pilihan halaman tidak valid.");
      await waitForPreview(receipt);
    } catch (error) { setImportError(error instanceof Error ? error.message : "Pilihan halaman tidak valid."); }
    finally { setImporting(false); setImportRefresh(value => value + 1); }
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
      <input type="hidden" name="source_import_id" value={sourceImportId} />
      {material && tutorStatus && (
        <section className={`material-ai-status ${material.rag_status === "failed" ? "failed" : ""}`} aria-label={t("Kesiapan materi untuk Tutor")}>
          <div>
            <strong>{t(tutorStatus.heading)}</strong>
            <p>{t(tutorStatus.description)}</p>
          </div>
          <div className="material-status-actions">
            <button type="button" className="button secondary" onClick={() => router.refresh()} disabled={pending || importing || indexing}><RefreshCw size={16} aria-hidden="true" /><UiText>{" Perbarui status"}</UiText></button>
            {tutorStatus.actionLabel && <button type="button" className="button primary" onClick={() => void retryIndex()} disabled={pending || importing || indexing}>{indexing ? <UiText>{"Menyiapkan…"}</UiText> : t(tutorStatus.actionLabel)}</button>}
          </div>
        </section>
      )}
      <label className="field"><UiText>{"Judul materi"}</UiText><Input
          required
          maxLength={200}
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("Contoh: Mengenal persamaan linear")}
        />
      </label>
      <section className="material-import" aria-label={t("Impor dokumen materi")}>
        <div className="material-import-heading">
          <span className="material-import-icon" aria-hidden="true"><UploadCloud size={24} /></span>
          <div><h2><UiText>{"Mulai dari dokumen Anda"}</UiText></h2><p><UiText>{"Unggah dokumen, tinjau teksnya, lalu simpan sebagai materi kelas."}</UiText></p></div>
        </div>
        <label className="field"><UiText>{"Pilih dokumen materi (opsional)"}</UiText><input
          type="file"
          accept=".pdf,.docx,.md,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
          disabled={pending || importing}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void importFile(file);
          }}
        />
        <small><UiText>{"PDF, termasuk hasil scan, DOCX, Markdown, atau TXT. Maksimal 25 MB. Tinjau hasil pembacaan sebelum menyimpan."}</UiText></small>
        </label>
        {book && <fieldset className="book-import-picker" disabled={importing || pending}>
          <legend>{t("Pilih bagian buku")}</legend>
          <p>{book.filename} · {t("{count} halaman", { count: book.totalPages })}</p>
          <label className="field">{t("Saran pembagian")}
            <NativeSelect value={sectionChoice} onChange={event => {
              const next = event.target.value; setSectionChoice(next);
              const section = book.sections[Number(next)];
              if (next !== "" && section) setPageRange({ first: String(section.first), last: String(Math.min(section.last, section.first + 149)) });
            }}>
              <option value="">{t("Pilih halaman sendiri")}</option>
              {book.sections.map((section, index) => <option key={`${section.first}-${index}`} value={String(index)}>
                {section.title} · {t("Halaman {first}–{last}", section)}</option>)}
            </NativeSelect>
          </label>
          <div className="book-import-range">
            <label className="field">{t("Halaman awal")}<Input type="number" min={1} max={book.totalPages} value={pageRange.first}
              onChange={event => { setSectionChoice(""); setPageRange({ ...pageRange, first: event.target.value }); }} /></label>
            <label className="field">{t("Halaman akhir")}<Input type="number" min={1} max={book.totalPages} value={pageRange.last}
              onChange={event => { setSectionChoice(""); setPageRange({ ...pageRange, last: event.target.value }); }} /></label>
          </div>
          <small>{t("Gunakan nomor halaman PDF, termasuk sampul. Maksimal 150 halaman dan 100.000 karakter per materi. Bab yang panjang bisa dibagi lagi.")}</small>
          <small>{t("Tinjau saran bab sebelum menyimpan. Simpan setiap bab sebagai materi tersendiri; modul pendek dapat langsung menjadi satu materi.")}</small>
          <div className="material-status-actions">
            <button type="button" className="button primary" onClick={() => void importPages()}>{t("Baca halaman terpilih")}</button>
            <button type="button" className="button secondary" onClick={() => setBook(null)}>{t("Batal")}</button>
          </div>
        </fieldset>}
        {importing && <p className="material-import-progress" role="status"><LoaderCircle className="spin" size={18} aria-hidden="true" /><UiText>{" Membaca dokumen, mohon tunggu…"}</UiText></p>}
        {sourceFilename && <p className="material-source-file"><FileText size={17} aria-hidden="true" /><span>{sourceFilename}</span></p>}
        {importNotice && <p className="material-import-notice" role="status">{importNotice}</p>}
        {importError && <p className="alert error-message" role="alert">{t(importError)}</p>}
      </section>
      <MaterialImportHistory classId={classId} refreshKey={importRefresh} onPreview={applyPreview} />
      <label className="field"><UiText>{"Isi materi"}</UiText><Textarea
          className="material-editor"
          required
          maxLength={100000}
          name="content"
          rows={18}
          value={content}
          disabled={importing || pending}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("Tulis penjelasan, contoh, dan petunjuk belajar di sini…")}
        />
        <small>
          {content.length.toLocaleString("id-ID")}<UiText>{"/ 100.000 karakter"}</UiText></small>
        <small><UiText>{"Setelah disimpan, isi materi disiapkan untuk Tutor. Hanya materi terbit yang dapat digunakan siswa anggota kelas."}</UiText></small>
      </label>
      <label className="field"><UiText>{"Visibilitas"}</UiText><NativeSelect
          name="published"
          value={published ? "yes" : "no"}
          onChange={(e) => setPublished(e.target.value === "yes")}
        >
          <option value="no"><UiText>{"Draft • hanya guru"}</UiText></option>
          <option value="yes"><UiText>{"Terbit • anggota kelas"}</UiText></option>
        </NativeSelect>
      </label>
      <button className="button primary" disabled={pending || importing}>
        {pending ? <UiText>{"Menyimpan…"}</UiText> : <UiText>{"Simpan materi"}</UiText>}
      </button>
    </form>
  );
}
