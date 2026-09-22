"use client";

import { useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  BookOpenCheck,
  Clock3,
  Headphones,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { notifyResult } from "@/lib/dialogs";
import type {
  AnalyticsWindow,
  StudentAnalytics,
  StudentAnalyticsSpoken,
} from "@/lib/analytics-types";
import { VoiceControls } from "./voice-controls";

const windows: Array<{ value: AnalyticsWindow; label: string }> = [
  { value: "today", label: "Hari ini" },
  { value: "week", label: "7 hari" },
  { value: "month", label: "30 hari" },
  { value: "all", label: "Semua waktu" },
];

function percent(value: number) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function minutesLabel(value: number) {
  if (value < 60) return `${Math.round(value)} menit`;
  const hours = Math.floor(value / 60);
  const minutes = Math.round(value % 60);
  return minutes ? `${hours} jam ${minutes} mnt` : `${hours} jam`;
}

function levelLabel(value: number) {
  if (value >= 0.8) return "Mantap";
  if (value >= 0.6) return "Berkembang";
  if (value >= 0.4) return "Perlu penguatan";
  return "Mulai dari dasar";
}

async function readJson<T>(response: Response, fallback: string) {
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: unknown };
    throw new Error(typeof body.message === "string" ? body.message : fallback);
  }
  return (await response.json()) as T;
}

export function StudentAnalytics({
  initial,
  initialSpoken,
}: {
  initial: StudentAnalytics;
  initialSpoken: string;
}) {
  const [data, setData] = useState(initial);
  const [spoken, setSpoken] = useState(initialSpoken);
  const [window, setWindow] = useState<AnalyticsWindow>(initial.window);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function changeWindow(next: AnalyticsWindow) {
    if (next === window || loading) return;
    setWindow(next);
    setLoading(true);
    setError("");
    try {
      const [summaryResponse, spokenResponse] = await Promise.all([
        fetch(`/api/analytics/me?window=${next}`, { cache: "no-store" }),
        fetch(`/api/analytics/me/spoken?window=${next}`, { cache: "no-store" }),
      ]);
      const summary = await readJson<StudentAnalytics>(
        summaryResponse,
        "Data progres belum dapat dimuat.",
      );
      const spokenPayload = await readJson<StudentAnalyticsSpoken>(
        spokenResponse,
        "Ringkasan suara belum dapat dimuat.",
      );
      setData(summary);
      setSpoken(spokenPayload.spoken);
    } catch (caught) {
      setWindow(data.window);
      setError(caught instanceof Error ? caught.message : "Data progres belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/analytics/me?window=${window}`, { cache: "no-store" });
      const next = await readJson<StudentAnalytics>(response, "Data progres belum dapat dimuat.");
      setData(next);
      const spokenResponse = await fetch(`/api/analytics/me/spoken?window=${window}`, {
        cache: "no-store",
      });
      const spokenPayload = await readJson<StudentAnalyticsSpoken>(
        spokenResponse,
        "Ringkasan suara belum dapat dimuat.",
      );
      setSpoken(spokenPayload.spoken);
      await notifyResult("Data progres sudah diperbarui.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Data progres belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="analytics-workspace" aria-label="Progres belajar siswa">
      <div className="analytics-toolbar">
        <div>
          <span className="analytics-kicker">
            <BarChart3 size={14} aria-hidden="true" /> RINGKASAN PERJALANANMU
          </span>
          <h2>Belajar dengan arah yang jelas.</h2>
          <p>Gunakan data ini untuk memilih langkah berikutnya, bukan untuk membandingkan diri.</p>
        </div>
        <button type="button" className="button secondary" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw size={16} className={loading ? "spin" : undefined} aria-hidden="true" />
          Perbarui data
        </button>
      </div>

      <div className="analytics-window-tabs" role="tablist" aria-label="Rentang waktu progres">
        {windows.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={window === item.value}
            className={window === item.value ? "active" : ""}
            onClick={() => void changeWindow(item.value)}
            disabled={loading}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && <p className="alert error-message analytics-error" role="alert">{error}</p>}

      <div className="analytics-hero panel">
        <div className="analytics-hero-copy">
          <span className="analytics-kicker">PROFIL BELAJAR</span>
          <h3>{data.student_name}</h3>
          <p>{levelLabel(data.overall_mastery)} · {data.n_sessions} sesi belajar pada periode ini.</p>
          <progress max={1} value={data.overall_mastery} aria-label={`Penguasaan materi ${percent(data.overall_mastery)}`} />
          <div className="analytics-progress-meta">
            <strong>{percent(data.overall_mastery)}</strong>
            <span>penguasaan materi</span>
          </div>
        </div>
        <div className="analytics-hero-mark" aria-hidden="true">
          <Target size={44} strokeWidth={1.5} />
          <span>Langkah kecil<br />tetap berarti.</span>
        </div>
      </div>

      <div className="analytics-stat-grid">
        <article className="panel analytics-stat-card">
          <span className="analytics-stat-icon blue"><BookOpenCheck size={19} aria-hidden="true" /></span>
          <span className="analytics-stat-label">Akurasi latihan</span>
          <strong>{percent(data.quiz_accuracy)}</strong>
          <small>{data.n_quiz_attempts} jawaban tercatat</small>
        </article>
        <article className="panel analytics-stat-card">
          <span className="analytics-stat-icon purple"><Clock3 size={19} aria-hidden="true" /></span>
          <span className="analytics-stat-label">Waktu belajar</span>
          <strong>{minutesLabel(data.total_minutes)}</strong>
          <small>{data.interaction_count} interaksi dengan tutor</small>
        </article>
        <article className="panel analytics-stat-card">
          <span className="analytics-stat-icon green"><TrendingUp size={19} aria-hidden="true" /></span>
          <span className="analytics-stat-label">Konsistensi</span>
          <strong>{percent(data.engagement_index)}</strong>
          <small>ritme belajar pada periode ini</small>
        </article>
      </div>

      <div className="analytics-columns">
        <article className="panel analytics-card">
          <div className="analytics-card-heading">
            <div>
              <span className="analytics-kicker">FOKUS BERIKUTNYA</span>
              <h3>Konsep yang perlu dikuatkan</h3>
            </div>
            <AlertTriangle size={20} aria-hidden="true" />
          </div>
          {data.weak_concepts.length ? (
            <div className="analytics-concept-list">
              {data.weak_concepts.map((concept) => (
                <div className="analytics-concept" key={concept.concept_id}>
                  <div className="analytics-concept-top">
                    <strong>{concept.concept_name}</strong>
                    <span>{percent(concept.mastery)}</span>
                  </div>
                  <progress max={1} value={concept.mastery} aria-label={`${concept.concept_name} ${percent(concept.mastery)}`} />
                  <small>{concept.n_attempts} latihan · coba satu langkah lagi hari ini</small>
                </div>
              ))}
            </div>
          ) : (
            <p className="analytics-empty">Belum ada konsep yang perlu perhatian khusus.</p>
          )}
        </article>

        <article className="panel analytics-card">
          <div className="analytics-card-heading">
            <div>
              <span className="analytics-kicker">KEKUATANMU</span>
              <h3>Konsep yang sudah menguat</h3>
            </div>
            <Sparkles size={20} aria-hidden="true" />
          </div>
          {data.strong_concepts.length ? (
            <div className="analytics-concept-list">
              {data.strong_concepts.map((concept) => (
                <div className="analytics-concept" key={concept.concept_id}>
                  <div className="analytics-concept-top">
                    <strong>{concept.concept_name}</strong>
                    <span>{percent(concept.mastery)}</span>
                  </div>
                  <progress max={1} value={concept.mastery} aria-label={`${concept.concept_name} ${percent(concept.mastery)}`} />
                  <small>{concept.n_attempts} latihan · pertahankan dengan menjelaskan ulang</small>
                </div>
              ))}
            </div>
          ) : (
            <p className="analytics-empty">Selesaikan satu latihan untuk melihat kekuatanmu.</p>
          )}
        </article>
      </div>

      <div className="analytics-lower-grid">
        <article className="panel analytics-card">
          <div className="analytics-card-heading">
            <div>
              <span className="analytics-kicker">REKOMENDASI PERSONAL</span>
              <h3>Langkah yang bisa kamu ambil</h3>
            </div>
            <Sparkles size={20} aria-hidden="true" />
          </div>
          <div className="analytics-recommendations">
            {data.active_recommendations.length ? data.active_recommendations.map((item) => (
              <div className="analytics-recommendation" key={item.id}>
                <span>{item.priority}</span>
                <div><strong>{item.title}</strong><p>{item.body}</p></div>
              </div>
            )) : <p className="analytics-empty">Belum ada rekomendasi baru. Teruskan ritmemu.</p>}
          </div>
        </article>
        <article className="panel analytics-card analytics-voice-card">
          <div className="analytics-card-heading">
            <div>
              <span className="analytics-kicker"><Headphones size={14} aria-hidden="true" /> RINGKASAN SUARA</span>
              <h3>Dengarkan progresmu</h3>
            </div>
          </div>
          <p className="analytics-spoken">{spoken}</p>
          <VoiceControls text={spoken} />
        </article>
      </div>
    </section>
  );
}
