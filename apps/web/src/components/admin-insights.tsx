"use client";
import { UiText, useI18n, UiDate } from "@/components/language-provider";


import { useState } from "react";
import {
  Activity,
  CheckCircle2,
  CircleAlert,
  Clock3,
  GraduationCap,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { notifyResult } from "@/lib/dialogs";
import type { AdminActivity, AdminOverview } from "@/lib/admin-insights-types";

function actionLabel(action: string) {
  return action
    .replaceAll(".", " · ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function readJson<T>(response: Response, fallback: string) {
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: unknown };
    throw new Error(typeof body.message === "string" ? body.message : fallback);
  }
  return (await response.json()) as T;
}

export function AdminInsights({
  initialOverview,
  initialActivity,
}: {
  initialOverview: AdminOverview;
  initialActivity: AdminActivity;
}) {
  const { t } = useI18n();
  const [overview, setOverview] = useState(initialOverview);
  const [activity, setActivity] = useState(initialActivity);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [overviewResponse, activityResponse] = await Promise.all([
        fetch("/api/admin/insights/overview", { cache: "no-store" }),
        fetch("/api/admin/activity?limit=30", { cache: "no-store" }),
      ]);
      setOverview(await readJson<AdminOverview>(overviewResponse, "Overview belum dapat dimuat."));
      setActivity(await readJson<AdminActivity>(activityResponse, "Aktivitas belum dapat dimuat."));
      await notifyResult("Insight operasional sudah diperbarui.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Insight operasional belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }

  const provider = overview.providers.elevenlabs;
  return (
    <section className="admin-insights" aria-label={t("Insight operasional admin")}>
      <div className="admin-insights-heading">
        <div>
          <span className="analytics-kicker"><Activity size={14} aria-hidden="true" /><UiText>{" OPERASIONAL"}</UiText></span>
          <h2><UiText>{"Semua sinyal penting dalam satu pandangan."}</UiText></h2>
          <p><UiText>{"Angka agregat untuk memantau kesehatan ruang belajar dan layanan pendukung."}</UiText></p>
        </div>
        <button type="button" className="button secondary" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw size={16} className={loading ? "spin" : undefined} aria-hidden="true" /><UiText>{"Perbarui"}</UiText></button>
      </div>
      {error && <p className="alert error-message" role="alert">{error}</p>}

      <div className="admin-insight-grid">
        <article className="panel admin-insight-card">
          <span className="admin-insight-icon blue"><Users size={19} aria-hidden="true" /></span>
          <span><UiText>{"Pengguna aktif"}</UiText></span>
          <strong>{overview.users.active}</strong>
          <small>{overview.users.total}<UiText>{" akun · "}</UiText>{overview.users.students}<UiText>{" siswa · "}</UiText>{overview.users.teachers}<UiText>{" guru"}</UiText></small>
        </article>
        <article className="panel admin-insight-card">
          <span className="admin-insight-icon purple"><GraduationCap size={19} aria-hidden="true" /></span>
          <span><UiText>{"Ruang belajar"}</UiText></span>
          <strong>{overview.learning.classrooms}</strong>
          <small>{overview.learning.sessions}<UiText>{" sesi · "}</UiText>{overview.learning.open_sessions}<UiText>{" masih terbuka"}</UiText></small>
        </article>
        <article className="panel admin-insight-card">
          <span className="admin-insight-icon green"><ShieldCheck size={19} aria-hidden="true" /></span>
          <span><UiText>{"Kesiapan suara"}</UiText></span>
            <strong>{!provider.enabled ? <UiText>{"Fallback aktif"}</UiText> : provider.configured ? <UiText>{"Siap"}</UiText> : <UiText>{"Perlu setup"}</UiText>}</strong>
          <small>{provider.tts_backend} · {provider.stt_backend}</small>
        </article>
      </div>

      <div className="admin-insight-columns">
        <article className="panel admin-activity-card">
          <div className="panel-heading">
            <div><h2><UiText>{"Aktivitas terbaru"}</UiText></h2><p><UiText>{"Metadata operasional tanpa isi percakapan atau kredensial."}</UiText></p></div>
            <Activity size={20} aria-hidden="true" />
          </div>
          {activity.items.length ? (
            <div className="admin-activity-list">
              {activity.items.map((item) => (
                <div className="admin-activity-item" key={`${item.type}-${item.id}`}>
                  <span className="admin-activity-dot" aria-hidden="true" />
                  <div>
                    <strong>{actionLabel(item.action)}</strong>
                    <p>{item.actor_name} · {item.target_name}</p>
                    <small><UiDate value={item.occurred_at} time empty="Belum tersedia" /></small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-insight-empty"><Clock3 size={22} aria-hidden="true" /><p><UiText>{"Belum ada aktivitas terbaru."}</UiText></p></div>
          )}
        </article>
        <article className="panel admin-activity-card">
          <div className="panel-heading">
            <div><h2><UiText>{"Status layanan"}</UiText></h2><p><UiText>{"Konfigurasi provider dibaca dari backend dan tidak menampilkan API key."}</UiText></p></div>
            <Sparkles size={20} aria-hidden="true" />
          </div>
          <div className="admin-provider-status">
            <div className={provider.enabled ? (provider.configured ? "ready" : "attention") : "idle"}>
              {provider.enabled && provider.configured ? <CheckCircle2 size={21} aria-hidden="true" /> : <CircleAlert size={21} aria-hidden="true" />}
              <div><strong><UiText>{"ElevenLabs"}</UiText></strong><span>{!provider.enabled ? <UiText>{"Belum dipilih; fallback lokal tetap aktif"}</UiText> : provider.configured ? <UiText>{"TTS dan STT siap digunakan"}</UiText> : <UiText>{"API key atau voice ID belum lengkap"}</UiText>}</span></div>
            </div>
            <dl>
              <div><dt><UiText>{"Text to speech"}</UiText></dt><dd>{provider.tts_backend}</dd></div>
              <div><dt><UiText>{"Speech to text"}</UiText></dt><dd>{provider.stt_backend}</dd></div>
              <div><dt><UiText>{"Kuis tersimpan"}</UiText></dt><dd>{overview.learning.quiz_sessions}</dd></div>
              <div><dt><UiText>{"Guru terdaftar"}</UiText></dt><dd>{overview.users.teachers}</dd></div>
            </dl>
          </div>
        </article>
      </div>
    </section>
  );
}
