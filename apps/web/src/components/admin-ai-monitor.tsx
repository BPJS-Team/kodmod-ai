"use client";

import { useState } from "react";
import {
  Bot,
  CheckCircle2,
  CircleAlert,
  Clock,
  Cpu,
  RefreshCw,
  Search,
  Sparkles,
  Volume2,
  Zap,
} from "lucide-react";
import { UiText, UiDate, useI18n } from "./language-provider";
import type { AdminAiUsage } from "@/lib/admin-insights-types";
import { notifyResult } from "@/lib/dialogs";

export function AdminAiMonitor({
  initialData,
}: {
  initialData: AdminAiUsage;
}) {
  const { t } = useI18n();
  const [data, setData] = useState<AdminAiUsage>(initialData);
  const [loading, setLoading] = useState(false);
  const [filterProvider, setFilterProvider] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  async function handleRefresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/insights/ai-usage", { cache: "no-store" });
      if (!res.ok) throw new Error("Gagal memuat status penggunaan AI.");
      const updated = (await res.json()) as AdminAiUsage;
      setData(updated);
      await notifyResult("Data pemantauan API berhasil diperbarui.");
    } catch (err) {
      await notifyResult(err instanceof Error ? err.message : "Gagal memperbarui data.", true);
    } finally {
      setLoading(false);
    }
  }

  const { elevenlabs, openai } = data;

  // ElevenLabs Calculations
  const elUsed = elevenlabs.character_count ?? 0;
  const elLimit = elevenlabs.character_limit ?? 0;
  const elRemaining = Math.max(0, elLimit - elUsed);
  const elPct = elLimit > 0 ? Math.min(100, Math.round((elUsed / elLimit) * 100)) : 0;
  const metric = (value: number | null) => value === null ? t("Belum tersedia") : value.toLocaleString();

  // Filter requests
  const filteredRequests = (data.recent_requests || []).filter((req) => {
    if (filterProvider !== "all" && req.provider.toLowerCase() !== filterProvider.toLowerCase()) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = req.actor_name.toLowerCase().includes(q);
      const matchTarget = req.target.toLowerCase().includes(q);
      const matchService = req.service.toLowerCase().includes(q);
      if (!matchName && !matchTarget && !matchService) return false;
    }
    return true;
  });

  return (
    <div className="admin-ai-monitor-layout">
      {/* Top Header Controls */}
      <div className="admin-ai-topbar">
        <div>
          <span className="analytics-kicker">
            <Cpu size={14} aria-hidden="true" />
            <UiText>{" PEMANTAUAN MESIN AI"}</UiText>
          </span>
          <h2><UiText>{"Status Kuota & Penggunaan API Eksternal"}</UiText></h2>
          <p><UiText>{"Periksa konfigurasi layanan dan kuota suara yang berhasil dimuat dari penyedia."}</UiText></p>
        </div>
        <button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={loading}
          className="button secondary refresh-btn"
        >
          <RefreshCw size={16} className={loading ? "spin" : undefined} aria-hidden="true" />
          <UiText>{"Perbarui Data"}</UiText>
        </button>
      </div>

      {/* Grid: 2 Provider Quota Cards */}
      <div className="ai-quota-grid">
        {/* Card 1: ElevenLabs */}
        <article className="panel ai-provider-card elevenlabs-card">
          <div className="ai-provider-header">
            <div className="ai-provider-title">
              <span className="ai-provider-icon indigo">
                <Volume2 size={22} aria-hidden="true" />
              </span>
              <div>
                <h3><UiText>{"ElevenLabs Speech Synthesis"}</UiText></h3>
                <small><UiText>{"Layanan Text-to-Speech untuk audio siswa tunanetra"}</UiText></small>
              </div>
            </div>
            <span className={`ai-status-tag ${elevenlabs.configured ? "ready" : "fallback"}`}>
              {elevenlabs.configured ? (
                <>
                  <CheckCircle2 size={14} aria-hidden="true" />
                  <UiText>{"Terkonfigurasi"}</UiText>
                </>
              ) : (
                <>
                  <CircleAlert size={14} aria-hidden="true" />
                  <UiText>{"Fallback Aktif"}</UiText>
                </>
              )}
            </span>
          </div>

          {/* Quota Progress */}
          <div className="ai-quota-meter">
            <div className="quota-meter-header">
              <span><UiText>{"Karakter Terpakai"}</UiText></span>
              <strong>
                {elevenlabs.available ? <>{elUsed.toLocaleString()} / {elLimit.toLocaleString()} <span className="quota-pct">({elPct}%)</span></> : <UiText>{"Kuota belum dapat dimuat"}</UiText>}
              </strong>
            </div>
            <div className="quota-progress-track">
              <div
                className={`quota-progress-fill ${elPct > 85 ? "danger" : elPct > 60 ? "warning" : "normal"}`}
                style={{ width: `${elPct}%` }}
              />
            </div>
            <div className="quota-meter-footer">
              <small>
                <UiText>{"Sisa kuota: "}</UiText>
                <strong>{elevenlabs.available ? elRemaining.toLocaleString() : t("Belum tersedia")}</strong> <UiText>{"karakter"}</UiText>
              </small>
              {elevenlabs.next_reset_unix && (
                <small>
                  <UiText>{"Reset: "}</UiText>
                  <strong><UiDate value={new Date(elevenlabs.next_reset_unix * 1000).toISOString()} /></strong>
                </small>
              )}
            </div>
          </div>

          {/* Specs List */}
          <div className="ai-specs-grid">
            <div className="spec-item">
              <span><UiText>{"Paket / Tier"}</UiText></span>
              <strong>{elevenlabs.tier?.toUpperCase() ?? t("Belum tersedia")}</strong>
            </div>
            <div className="spec-item">
              <span><UiText>{"Model Suara"}</UiText></span>
              <strong>{elevenlabs.tts_model}</strong>
            </div>
            <div className="spec-item">
              <span><UiText>{"Speech to Text"}</UiText></span>
              <strong>{elevenlabs.stt_backend}</strong>
            </div>
          </div>
        </article>

        {/* Card 2: OpenAI (GPT) */}
        <article className="panel ai-provider-card openai-card">
          <div className="ai-provider-header">
            <div className="ai-provider-title">
              <span className="ai-provider-icon emerald">
                <Sparkles size={22} aria-hidden="true" />
              </span>
              <div>
                <h3><UiText>{"OpenAI GPT Intelligence"}</UiText></h3>
                <small><UiText>{"Mesin penalaran Tutor AI, penyusunan kuis, dan embeddings"}</UiText></small>
              </div>
            </div>
            <span className={`ai-status-tag ${openai.configured ? "ready" : "fallback"}`}>
              {openai.configured ? (
                <>
                  <CheckCircle2 size={14} aria-hidden="true" />
                  <UiText>{"Terkonfigurasi"}</UiText>
                </>
              ) : (
                <>
                  <CircleAlert size={14} aria-hidden="true" />
                  <UiText>{"Belum Ada Key"}</UiText>
                </>
              )}
            </span>
          </div>

          {/* Token Usage Summary */}
          <div className="ai-token-stats">
            <div className="token-total-box">
              <span><UiText>{"Akumulasi Token Sesi"}</UiText></span>
              <strong>{metric(openai.total_tokens)}</strong>
              <small><UiText>{"Pemakaian token belum dicatat per permintaan."}</UiText></small>
            </div>
            <div className="token-breakdown-row">
              <div className="breakdown-sub">
                <small><UiText>{"Input (Prompt)"}</UiText></small>
                <strong>{metric(openai.prompt_tokens)}</strong>
              </div>
              <div className="breakdown-sub">
                <small><UiText>{"Output (Jawaban)"}</UiText></small>
                <strong>{metric(openai.completion_tokens)}</strong>
              </div>
            </div>
          </div>

          {/* Model Mapping */}
          <div className="ai-specs-grid">
            <div className="spec-item">
              <span><UiText>{"Model Tutor"}</UiText></span>
              <strong>{openai.models.tutor}</strong>
            </div>
            <div className="spec-item">
              <span><UiText>{"Model Kuis"}</UiText></span>
              <strong>{openai.models.quiz}</strong>
            </div>
            <div className="spec-item">
              <span><UiText>{"Embeddings"}</UiText></span>
              <strong>{openai.models.embedding}</strong>
            </div>
          </div>
        </article>
      </div>

      {/* Riwayat Panggilan API (Request Log Table) */}
      <section className="panel table-panel ai-logs-panel">
        <div className="panel-heading">
          <div>
            <h2><UiText>{"Riwayat Panggilan API Terakhir"}</UiText></h2>
            <p><UiText>{"Log panggilan AI untuk aktivitas siswa, narasi materi, dan sesi kuis."}</UiText></p>
          </div>
        </div>

        {/* Filter bar untuk log */}
        <div className="ai-log-filter-bar">
          <div className="ai-filter-group">
            <button
              type="button"
              className={`ai-filter-tab ${filterProvider === "all" ? "active" : ""}`}
              onClick={() => setFilterProvider("all")}
            >
              <UiText>{"Semua Provider"}</UiText>
            </button>
            <button
              type="button"
              className={`ai-filter-tab ${filterProvider === "openai" ? "active" : ""}`}
              onClick={() => setFilterProvider("openai")}
            >
              <Sparkles size={14} aria-hidden="true" />
              {"OpenAI"}
            </button>
            <button
              type="button"
              className={`ai-filter-tab ${filterProvider === "elevenlabs" ? "active" : ""}`}
              onClick={() => setFilterProvider("elevenlabs")}
            >
              <Volume2 size={14} aria-hidden="true" />
              {"ElevenLabs"}
            </button>
          </div>

          <div className="ai-search-box">
            <Search size={16} aria-hidden="true" />
            <input
              type="text"
              placeholder={t("Cari berdasarkan nama siswa atau sesi…")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Tabel Request Log */}
        {filteredRequests.length > 0 ? (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th><UiText>{"Waktu"}</UiText></th>
                  <th><UiText>{"Provider & Layanan"}</UiText></th>
                  <th><UiText>{"Model / Voice"}</UiText></th>
                  <th><UiText>{"Siswa / Target"}</UiText></th>
                  <th><UiText>{"Volume"}</UiText></th>
                  <th><UiText>{"Latensi"}</UiText></th>
                  <th><UiText>{"Status"}</UiText></th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => (
                  <tr key={req.id}>
                    <td>
                      <span className="log-time">
                        <Clock size={13} aria-hidden="true" />
                        <UiDate value={req.timestamp} time empty="Baru saja" />
                      </span>
                    </td>
                    <td>
                      <div className="log-service-info">
                        <span className={`provider-badge ${req.provider.toLowerCase()}`}>
                          {req.provider}
                        </span>
                        <strong>{req.service}</strong>
                      </div>
                    </td>
                    <td>
                      <code className="model-code">{req.model}</code>
                    </td>
                    <td>
                      <div className="log-target-cell">
                        <strong>{req.actor_name}</strong>
                        <small>{req.target}</small>
                      </div>
                    </td>
                    <td>
                      <span className="log-units">{req.units}</span>
                    </td>
                    <td>
                      <span className="log-latency">
                        <Zap size={13} aria-hidden="true" />
                        {req.latency}
                      </span>
                    </td>
                    <td>
                      <span className={`log-status-tag ${req.status}`}>
                        {req.status === "success" ? (
                          <UiText>{"Sukses"}</UiText>
                        ) : req.status === "fallback" ? (
                          <UiText>{"Fallback"}</UiText>
                        ) : (
                          <UiText>{"Gagal"}</UiText>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ai-logs-empty">
            <Bot size={28} aria-hidden="true" />
            <p><UiText>{"Riwayat penggunaan API belum tersedia."}</UiText></p>
          </div>
        )}
      </section>
    </div>
  );
}
