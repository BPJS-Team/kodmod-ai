"use client";

import { useI18n, UiText } from "./language-provider";
import type { AdminOverview } from "@/lib/admin-insights-types";
import { BarChart3, PieChart } from "lucide-react";

export function AdminOverviewCharts({
  overview,
}: {
  overview: AdminOverview;
}) {
  const { t } = useI18n();

  const totalUsers = overview.users.total;
  const students = overview.users.students || 0;
  const teachers = overview.users.teachers || 0;
  const admins = overview.users.admins || 0;
  const activeUsers = overview.users.active || 0;

  const percent = (count: number) => totalUsers > 0 ? (count / totalUsers) * 100 : 0;
  const studentPct = percent(students);
  const teacherPct = percent(teachers);
  const adminPct = percent(admins);
  const activePct = Math.round(percent(activeUsers));

  // Learning metrics for bar chart
  const learningBars = [
    {
      label: "Kelas Terdaftar",
      value: overview.learning.classrooms,
      color: "linear-gradient(180deg, #3b82f6, #1d4ed8)",
      desc: "Ruang kelas aktif",
    },
    {
      label: "Sesi Belajar",
      value: overview.learning.sessions,
      color: "linear-gradient(180deg, #6366f1, #4338ca)",
      desc: "Total sesi dibuka",
    },
    {
      label: "Sesi Berjalan",
      value: overview.learning.open_sessions,
      color: "linear-gradient(180deg, #10b981, #047857)",
      desc: "Sedang berlangsung",
    },
    {
      label: "Latihan & Kuis",
      value: overview.learning.quiz_sessions,
      color: "linear-gradient(180deg, #f59e0b, #b45309)",
      desc: "Sesi evaluasi",
    },
  ];

  const maxLearningValue = Math.max(1, ...learningBars.map((b) => b.value));

  return (
    <div className="admin-charts-grid">
      {/* Chart 1: Distribusi Pengguna */}
      <article className="panel admin-chart-card">
        <div className="panel-heading">
          <div>
            <div className="chart-kicker">
              <PieChart size={15} aria-hidden="true" />
              <span><UiText>{"DISTRIBUSI PENGGUNA"}</UiText></span>
            </div>
            <h2><UiText>{"Komposisi Akun & Keaktifan"}</UiText></h2>
            <p><UiText>{"Perbandingan rasio peran siswa, guru, dan administrator."}</UiText></p>
          </div>
          <span className="chart-active-pill">
            <span className="pulsing-dot" aria-hidden="true" />
            {activePct}% <UiText>{"Aktif"}</UiText>
          </span>
        </div>

        {/* Visual Multi-segment Bar */}
        <div className="role-ratio-bar-wrap" aria-label={t("Grafik perbandingan peran pengguna")}>
          <div className="role-ratio-bar">
            <div
              className="segment segment-student"
              style={{ width: `${studentPct}%` }}
              title={`${t("Siswa")}: ${students} (${Math.round(studentPct)}%)`}
            />
            <div
              className="segment segment-teacher"
              style={{ width: `${teacherPct}%` }}
              title={`${t("Guru")}: ${teachers} (${Math.round(teacherPct)}%)`}
            />
            <div
              className="segment segment-admin"
              style={{ width: `${adminPct}%` }}
              title={`${t("Admin")}: ${admins} (${Math.round(adminPct)}%)`}
            />
          </div>
        </div>

        {/* Legend Cards */}
        <div className="role-legend-grid">
          <div className="role-legend-card student-card">
            <div className="legend-indicator blue" />
            <div>
              <span className="legend-title"><UiText>{"Siswa"}</UiText></span>
              <strong className="legend-value">{students}</strong>
              <small className="legend-pct">{Math.round(studentPct)}%</small>
            </div>
          </div>
          <div className="role-legend-card teacher-card">
            <div className="legend-indicator green" />
            <div>
              <span className="legend-title"><UiText>{"Guru"}</UiText></span>
              <strong className="legend-value">{teachers}</strong>
              <small className="legend-pct">{Math.round(teacherPct)}%</small>
            </div>
          </div>
          <div className="role-legend-card admin-card">
            <div className="legend-indicator amber" />
            <div>
              <span className="legend-title"><UiText>{"Admin"}</UiText></span>
              <strong className="legend-value">{admins}</strong>
              <small className="legend-pct">{Math.round(adminPct)}%</small>
            </div>
          </div>
        </div>
      </article>

      {/* Chart 2: Statistik Pembelajaran */}
      <article className="panel admin-chart-card">
        <div className="panel-heading">
          <div>
            <div className="chart-kicker">
              <BarChart3 size={15} aria-hidden="true" />
              <span><UiText>{"AKTIVITAS RUANG BELAJAR"}</UiText></span>
            </div>
            <h2><UiText>{"Volume Pembelajaran & Kelas"}</UiText></h2>
            <p><UiText>{"Aktivitas sesi kelas, interaksi tutor, dan pengerjaan evaluasi."}</UiText></p>
          </div>
        </div>

        {/* Visual Column / Bar Chart */}
        <div className="learning-chart-bars">
          {learningBars.map((bar) => {
            const heightPct = Math.round((bar.value / maxLearningValue) * 100);
            return (
              <div className="learning-bar-col" key={bar.label}>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      height: `${heightPct}%`,
                      background: bar.color,
                    }}
                  >
                    <span className="bar-val-badge">{bar.value}</span>
                  </div>
                </div>
                <div className="bar-info">
                  <strong className="bar-label">{t(bar.label)}</strong>
                  <small className="bar-desc">{t(bar.desc)}</small>
                </div>
              </div>
            );
          })}
        </div>
      </article>
    </div>
  );
}
