"use client";
import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw, FileCheck2 } from "lucide-react";
import type { MaterialImportRecord } from "@/lib/import-types";
import { confirmAction, notifyResult } from "@/lib/dialogs";
import { Button } from "./ui/button";
import { useI18n } from "./language-provider";

export function MaterialImportHistory({ classId, refreshKey, onPreview }: {
  classId: string; refreshKey: number; onPreview: (record: MaterialImportRecord) => Promise<void>;
}) {
  const { t } = useI18n();
  const [records, setRecords] = useState<MaterialImportRecord[]>([]), [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const base = `/api/classes/${classId}/imports`;
  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(base, { signal, cache: "no-store" });
      if (!response.ok) throw new Error(t("Riwayat dokumen belum dapat dibuka."));
      const data = await response.json();
      if (Array.isArray(data)) { setRecords(data); setError(""); }
    } catch (caught) { if (!signal?.aborted) setError(caught instanceof Error ? caught.message : t("Riwayat dokumen belum dapat dibuka.")); }
  }, [base, t]);
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => { if (!controller.signal.aborted) void refresh(controller.signal); });
    return () => controller.abort();
  }, [refresh, refreshKey]);
  const processing = records.some(record => ["pending", "running", "retry"].includes(record.state));
  useEffect(() => {
    if (!processing) return;
    const controller = new AbortController();
    const timer = setInterval(() => void refresh(controller.signal), 3000);
    return () => { clearInterval(timer); controller.abort(); };
  }, [processing, refresh]);
  async function open(record: MaterialImportRecord, retry = false) {
    if (busy) return;
    if (retry && !(await confirmAction({ title: "Proses ulang dokumen?", text: "Berkas asli yang tersimpan akan dibaca lagi.", confirmText: "Proses ulang" }))) return;
    setBusy(record.import_id);
    try {
      const response = await fetch(`${base}/${record.import_id}${retry ? "/retry" : ""}`, { method: retry ? "POST" : "GET", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || t("Dokumen belum dapat dibaca."));
      if (!retry) await onPreview(data);
      await refresh();
    } catch (caught) { await notifyResult(caught instanceof Error ? caught.message : "Dokumen belum dapat dibaca.", true); }
    finally { setBusy(""); }
  }
  return <details className="material-import-history" open={processing || undefined}>
    <summary>{t("Dokumen tersimpan")}{processing && ` · ${t("Sedang diproses")}`}</summary>
    <p>{t("Hasil pembacaan tetap tersimpan. Buka dan tinjau sebelum digunakan sebagai materi.")}</p>
    <Button type="button" variant="outline" onClick={() => void refresh()}><RefreshCw size={16} aria-hidden="true" />{t("Perbarui status")}</Button>
    {error && <p role="alert">{error}</p>}
    {!records.length && <p>{t("Belum ada dokumen tersimpan.")}</p>}
    <ul className="import-records">{records.map(record => <li key={record.import_id}>
      <div><strong>{record.filename}</strong><p role={record.state === "running" ? "status" : undefined}>{t(({ complete: "Siap ditinjau", failed: "Perlu diproses ulang", running: "Sedang diproses", pending: "Dalam antrean", retry: "Menunggu percobaan ulang" })[record.state])}</p></div>
      <div className="material-status-actions">
        {record.state === "complete" && <Button type="button" onClick={() => void open(record)} disabled={Boolean(busy)}><FileCheck2 size={16} aria-hidden="true" />{t("Tinjau hasil")}</Button>}
        {record.state === "failed" && <Button type="button" variant="outline" onClick={() => void open(record, true)} disabled={Boolean(busy)}>{t("Proses ulang")}</Button>}
        <a className="button secondary" href={`${base}/${record.import_id}/original`} download><Download size={16} aria-hidden="true" />{t("Berkas asli")}</a>
      </div>
    </li>)}</ul>
  </details>;
}
