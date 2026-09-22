"use client";

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

function dateLabel(value: string | null) {
  if (!value) return "Belum tersedia";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

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
    <section className="admin-insights" aria-label="Insight operasional admin">
      <div className="admin-insights-heading">
        <div>
          <span className="analytics-kicker"><Activity size={14} aria-hidden="true" /> OPERASIONAL</span>
          <h2>Semua sinyal penting dalam satu pandangan.</h2>
          <p>Angka agregat untuk memantau kesehatan ruang belajar dan layanan pendukung.</p>
        </div>
        <button type="button" className="button secondary" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw size={16} className={loading ? "spin" : undefined} aria-hidden="true" /> Perbarui
        </button>
      </div>
      {error && <p className="alert error-message" role="alert">{error}</p>}

      <div className="admin-insight-grid">
        <article className="panel admin-insight-card">
          <span className="admin-insight-icon blue"><Users size={19} aria-hidden="true" /></span>
          <span>Pengguna aktif</span>
          <strong>{overview.users.active}</strong>
          <small>{overview.users.total} akun · {overview.users.students} siswa · {overview.users.teachers} guru</small>
        </article>
        <article className="panel admin-insight-card">
          <span className="admin-insight-icon purple"><GraduationCap size={19} aria-hidden="true" /></span>
          <span>Ruang belajar</span>
          <strong>{overview.learning.classrooms}</strong>
          <small>{overview.learning.sessions} sesi · {overview.learning.open_sessions} masih terbuka</small>
        </article>
        <article className="panel admin-insight-card">
          <span className="admin-insight-icon green"><ShieldCheck size={19} aria-hidden="true" /></span>
          <span>Kesiapan suara</span>
            <strong>{!provider.enabled ? "Fallback aktif" : provider.configured ? "Siap" : "Perlu setup"}</strong>
          <small>{provider.tts_backend} · {provider.stt_backend}</small>
        </article>
      </div>

      <div className="admin-insight-columns">
        <article className="panel admin-activity-card">
          <div className="panel-heading">
            <div><h2>Aktivitas terbaru</h2><p>Metadata operasional tanpa isi percakapan atau kredensial.</p></div>
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
                    <small>{dateLabel(item.occurred_at)}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-insight-empty"><Clock3 size={22} aria-hidden="true" /><p>Belum ada aktivitas terbaru.</p></div>
          )}
        </article>
        <article className="panel admin-activity-card">
          <div className="panel-heading">
            <div><h2>Status layanan</h2><p>Konfigurasi provider dibaca dari backend dan tidak menampilkan API key.</p></div>
            <Sparkles size={20} aria-hidden="true" />
          </div>
          <div className="admin-provider-status">
            <div className={provider.configured ? "ready" : "attention"}>
              {provider.enabled && provider.configured ? <CheckCircle2 size={21} aria-hidden="true" /> : <CircleAlert size={21} aria-hidden="true" />}
              <div><strong>ElevenLabs</strong><span>{!provider.enabled ? "Belum dipilih; fallback lokal tetap aktif" : provider.configured ? "TTS dan STT siap digunakan" : "API key atau voice ID belum lengkap"}</span></div>
            </div>
            <dl>
              <div><dt>Text to speech</dt><dd>{provider.tts_backend}</dd></div>
              <div><dt>Speech to text</dt><dd>{provider.stt_backend}</dd></div>
              <div><dt>Kuis tersimpan</dt><dd>{overview.learning.quiz_sessions}</dd></div>
              <div><dt>Undangan aktif</dt><dd>{overview.invitations.active}</dd></div>
            </dl>
          </div>
        </article>
      </div>
    </section>
  );
}
