"use client";
import { UiText, useI18n } from "@/components/language-provider";


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
  const { t } = useI18n();
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
    <section className="analytics-workspace" aria-label={t("Progres belajar siswa")}>
      <div className="analytics-toolbar">
        <div>
          <span className="analytics-kicker">
            <BarChart3 size={14} aria-hidden="true" /><UiText>{"RINGKASAN PERJALANANMU"}</UiText></span>
          <h2><UiText>{"Belajar dengan arah yang jelas."}</UiText></h2>
          <p><UiText>{"Gunakan data ini untuk memilih langkah berikutnya, bukan untuk membandingkan diri."}</UiText></p>
        </div>
        <button type="button" className="button secondary" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw size={16} className={loading ? "spin" : undefined} aria-hidden="true" /><UiText>{"Perbarui data"}</UiText></button>
      </div>

      <div className="analytics-window-tabs" role="tablist" aria-label={t("Rentang waktu progres")}>
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
            {t(item.label)}
          </button>
        ))}
      </div>

      {error && <p className="alert error-message analytics-error" role="alert">{error}</p>}

      <div className="analytics-hero panel">
        <div className="analytics-hero-copy">
          <span className="analytics-kicker"><UiText>{"PROFIL BELAJAR"}</UiText></span>
          <h3>{data.student_name}</h3>
          <p>{levelLabel(data.overall_mastery)} · {data.n_sessions}<UiText>{" sesi belajar pada periode ini."}</UiText></p>
          <progress max={1} value={data.overall_mastery} aria-label={`Penguasaan materi ${percent(data.overall_mastery)}`} />
          <div className="analytics-progress-meta">
            <strong>{percent(data.overall_mastery)}</strong>
            <span><UiText>{"penguasaan materi"}</UiText></span>
          </div>
        </div>
        <div className="analytics-hero-mark" aria-hidden="true">
          <Target size={44} strokeWidth={1.5} />
          <span><UiText>{"Langkah kecil"}</UiText><br /><UiText>{"tetap berarti."}</UiText></span>
        </div>
      </div>

      <div className="analytics-stat-grid">
        <article className="panel analytics-stat-card">
          <span className="analytics-stat-icon blue"><BookOpenCheck size={19} aria-hidden="true" /></span>
          <span className="analytics-stat-label"><UiText>{"Akurasi latihan"}</UiText></span>
          <strong>{percent(data.quiz_accuracy)}</strong>
          <small>{data.n_quiz_attempts}<UiText>{" jawaban tercatat"}</UiText></small>
        </article>
        <article className="panel analytics-stat-card">
          <span className="analytics-stat-icon purple"><Clock3 size={19} aria-hidden="true" /></span>
          <span className="analytics-stat-label"><UiText>{"Waktu belajar"}</UiText></span>
          <strong>{minutesLabel(data.total_minutes)}</strong>
          <small>{data.interaction_count}<UiText>{" interaksi dengan tutor"}</UiText></small>
        </article>
        <article className="panel analytics-stat-card">
          <span className="analytics-stat-icon green"><TrendingUp size={19} aria-hidden="true" /></span>
          <span className="analytics-stat-label"><UiText>{"Konsistensi"}</UiText></span>
          <strong>{percent(data.engagement_index)}</strong>
          <small><UiText>{"ritme belajar pada periode ini"}</UiText></small>
        </article>
      </div>

      <div className="analytics-columns">
        <article className="panel analytics-card">
          <div className="analytics-card-heading">
            <div>
              <span className="analytics-kicker"><UiText>{"FOKUS BERIKUTNYA"}</UiText></span>
              <h3><UiText>{"Konsep yang perlu dikuatkan"}</UiText></h3>
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
                  <small>{concept.n_attempts}<UiText>{" latihan · coba satu langkah lagi hari ini"}</UiText></small>
                </div>
              ))}
            </div>
          ) : (
            <p className="analytics-empty"><UiText>{"Belum ada konsep yang perlu perhatian khusus."}</UiText></p>
          )}
        </article>

        <article className="panel analytics-card">
          <div className="analytics-card-heading">
            <div>
              <span className="analytics-kicker"><UiText>{"KEKUATANMU"}</UiText></span>
              <h3><UiText>{"Konsep yang sudah menguat"}</UiText></h3>
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
                  <small>{concept.n_attempts}<UiText>{" latihan · pertahankan dengan menjelaskan ulang"}</UiText></small>
                </div>
              ))}
            </div>
          ) : (
            <p className="analytics-empty"><UiText>{"Selesaikan satu latihan untuk melihat kekuatanmu."}</UiText></p>
          )}
        </article>
      </div>

      <div className="analytics-lower-grid">
        <article className="panel analytics-card">
          <div className="analytics-card-heading">
            <div>
              <span className="analytics-kicker"><UiText>{"REKOMENDASI PERSONAL"}</UiText></span>
              <h3><UiText>{"Langkah yang bisa kamu ambil"}</UiText></h3>
            </div>
            <Sparkles size={20} aria-hidden="true" />
          </div>
          <div className="analytics-recommendations">
            {data.active_recommendations.length ? data.active_recommendations.map((item) => (
              <div className="analytics-recommendation" key={item.id}>
                <span>{item.priority}</span>
                <div><strong>{item.title}</strong><p>{item.body}</p></div>
              </div>
            )) : <p className="analytics-empty"><UiText>{"Belum ada rekomendasi baru. Teruskan ritmemu."}</UiText></p>}
          </div>
        </article>
        <article className="panel analytics-card analytics-voice-card">
          <div className="analytics-card-heading">
            <div>
              <span className="analytics-kicker"><Headphones size={14} aria-hidden="true" /><UiText>{" RINGKASAN SUARA"}</UiText></span>
              <h3><UiText>{"Dengarkan progresmu"}</UiText></h3>
            </div>
          </div>
          <p className="analytics-spoken">{spoken}</p>
          <VoiceControls text={spoken} />
        </article>
      </div>
    </section>
  );
}
