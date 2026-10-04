"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, RotateCcw, Save } from "lucide-react";
import type { AdminMaterial } from "@/lib/admin-material-types";
import { confirmAction, notifyResult } from "@/lib/dialogs";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { UiText, useI18n } from "./language-provider";
import type { MaterialImportRecord } from "@/lib/import-types";

export function AdminMaterialEditor({ material }: { material: AdminMaterial }) {
  const router = useRouter();
  const { t } = useI18n();
  const [source, setSource] = useState<MaterialImportRecord | null>(null);
  const [title, setTitle] = useState(material.title);
  const [content, setContent] = useState(material.content ?? "");
  const [published, setPublished] = useState(material.published);
  const [busy, setBusy] = useState(false);
  async function update(index = false) {
    if (busy || material.is_archived) return;
    if (!(await confirmAction({ title: index ? "Proses ulang materi?" : "Simpan perubahan materi?", text: index ? "Materi akan disiapkan kembali untuk Tutor." : "Perubahan berlaku untuk kelas ini. Materi yang terbit akan disiapkan untuk Tutor kembali jika isinya berubah.", confirmText: index ? "Proses ulang" : "Simpan perubahan" }))) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/materials/${material.id}${index ? "/index" : ""}`, {
        method: index ? "POST" : "PUT", headers: { "Content-Type": "application/json" },
        ...(!index ? { body: JSON.stringify({ title, content, published, source_filename: material.source_filename ?? null, source_import_id: material.source_import_id ?? null }) } : {}),
      });
      if (!response.ok) { const body = await response.json(); throw new Error(body.message || "Materi belum dapat disimpan."); }
      await notifyResult(index ? "Materi sedang disiapkan ulang." : "Perubahan materi berhasil disimpan.");
      router.refresh();
    } catch (caught) { await notifyResult(caught instanceof Error ? caught.message : "Materi belum dapat disimpan.", true); }
    finally { setBusy(false); }
  }
  return <form className="panel admin-material-form" onSubmit={(event) => { event.preventDefault(); void update(); }}>
    {material.source_import_id && <section className="material-import-notice">
      <strong>{t("Berkas sumber")}</strong>
      <div className="material-status-actions"><a className="button secondary" href={`/api/admin/materials/${material.id}/original`} download>{t("Unduh berkas asli")}</a>
      <Button type="button" variant="outline" onClick={async () => {
        try { const response = await fetch(`/api/admin/materials/${material.id}/source`); if (!response.ok) throw new Error("Berkas sumber belum dapat dibuka."); setSource(await response.json()); }
        catch (caught) { await notifyResult(caught instanceof Error ? caught.message : "Berkas sumber belum dapat dibuka.", true); }
      }}>{t("Lihat asal halaman")}</Button></div>
      {source && <div><p>{source.filename}</p><ul>{source.preview?.pages?.map(page => <li key={page.page}>{t("Halaman {page}", { page: page.page })} · {page.method === "ocr" ? t("Dibaca dari gambar") : t("Teks asli")}{page.confidence != null && ` · ${t("Keyakinan pembacaan {confidence}%", { confidence: page.confidence })}`}</li>)}</ul></div>}
    </section>}
    <label className="field"><UiText>{"Judul materi"}</UiText><input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} disabled={busy || material.is_archived} /></label>
    <label className="field"><UiText>{"Isi materi"}</UiText><textarea required rows={20} maxLength={100000} value={content} onChange={(event) => setContent(event.target.value)} disabled={busy || material.is_archived} /></label>
    <label className="admin-material-publish"><Switch checked={published} onCheckedChange={setPublished} disabled={busy || material.is_archived} aria-label="Terbitkan materi" /><span><strong><UiText>{"Terbitkan materi"}</UiText></strong><small><UiText>{"Siswa hanya dapat membuka materi yang terbit di kelasnya."}</UiText></small></span></label>
    <div className="guided-actions"><Button type="submit" disabled={busy || material.is_archived || !title.trim() || !content.trim()}>{busy ? <LoaderCircle className="spin" size={17} aria-hidden="true" /> : <Save size={17} aria-hidden="true" />}<UiText>{"Simpan perubahan"}</UiText></Button><Button variant="outline" type="button" onClick={() => void update(true)} disabled={busy || material.is_archived || !material.published}><RotateCcw size={17} aria-hidden="true" /><UiText>{"Proses ulang"}</UiText></Button></div>
  </form>;
}
