"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Headphones, LoaderCircle, RotateCcw, Send, Sparkles } from "lucide-react";
import type { StudentMaterial } from "@/lib/class-types";
import type { LearningSession } from "@/lib/learning-types";
import { createQuizSubmissionId } from "@/lib/quiz-submission.mjs";
import { confirmAction } from "@/lib/dialogs";
import { UiText, useI18n } from "./language-provider";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { VoiceControls } from "./voice-controls";
import { StudentQuiz } from "./student-quiz";
import "@/styles/guided-learning.css";

async function read<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) throw Object.assign(new Error(body.message || "Sesi belajar belum dapat dimuat."), { status: response.status });
  return body as T;
}

const actions: Record<string, { label: string; Icon: typeof ArrowRight }> = {
  continue: { label: "Lanjut belajar", Icon: ArrowRight },
  repeat: { label: "Jelaskan lagi", Icon: RotateCcw },
  check: { label: "Cek pemahaman", Icon: CheckCircle2 },
  quiz: { label: "Mini kuis", Icon: Sparkles },
  finish: { label: "Selesaikan belajar", Icon: CheckCircle2 },
};

export function GuidedTutor({ materials, initialSessions, initialMaterialId }: {
  materials: StudentMaterial[];
  initialSessions: LearningSession[];
  initialMaterialId?: string;
}) {
  const { t, language } = useI18n();
  const initial = initialMaterialId ? initialSessions.find((row) => row.material_id === initialMaterialId) : initialSessions[0];
  const [lesson, setLesson] = useState<LearningSession | null>(initial ?? null);
  const [sessions, setSessions] = useState(initialSessions);
  const [materialId, setMaterialId] = useState(initialMaterialId ?? initial?.material_id ?? "");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [autoPlayKey, setAutoPlayKey] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState("");
  const inFlight = useRef(false);
  const pending = useRef<{ path: string; body: Record<string, unknown> } | null>(null);
  const explanation = useRef<HTMLHeadingElement>(null);
  const locked = lesson?.phase === "quiz";
  const selected = materials.find((row) => row.id === materialId);
  const ready = selected?.rag_status === "ready" && selected.indexed_version === selected.content_version && (selected.indexed_mapping_version ?? 0) === (selected.mapping_version ?? 0);

  function accept(next: LearningSession, play = false) {
    setLesson(next);
    setMaterialId(next.material_id);
    setSessions((rows) => [next, ...rows.filter((row) => row.session_id !== next.session_id)]);
    if (play && next.phase === "learning") setAutoPlayKey(`${next.session_id}:${next.revision}`);
    requestAnimationFrame(() => explanation.current?.focus());
  }

  async function recover(id: string) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try { accept(await read<LearningSession>(await fetch(`/api/learning/sessions/${id}`, { cache: "no-store" }))); }
    catch (caught) { setError(caught instanceof Error ? caught.message : t("Sesi belum dapat dibuka.")); }
    finally { inFlight.current = false; setBusy(false); }
  }

  async function begin() {
    if (inFlight.current || !selected || !ready || locked || uncertain) return;
    if (!(await confirmAction({ title: "Mulai belajar materi ini?", text: selected.title, confirmText: "Mulai belajar" }))) return;
    inFlight.current = true; setBusy(true); setError("");
    try {
      const response = await fetch("/api/learning/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ class_id: selected.class_id, material_id: selected.id }) });
      accept(await read<LearningSession>(response), true); setLastQuestion(""); setDraft("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : t("Belajar belum dapat dimulai.")); }
    finally { inFlight.current = false; setBusy(false); }
  }

  async function act(action: string, retry = false) {
    if (!lesson || inFlight.current || (!retry && uncertain)) return;
    const text = draft.trim();
    if (action === "question" && !text && !retry) return;
    if (!retry && ["quiz", "check", "finish"].includes(action) && !(await confirmAction({
      title: action === "finish" ? "Selesaikan sesi belajar?" : "Mulai cek pemahaman?",
      text: action === "finish" ? "Penjelasan dan hasil mini kuis tetap tersimpan." : "Jawaban yang sudah dikirim akan disimpan. Selesaikan mini kuis sebelum melanjutkan materi.",
      confirmText: action === "finish" ? "Selesaikan belajar" : "Mulai",
    }))) return;
    const request = retry && pending.current ? pending.current : {
      path: `/api/learning/sessions/${lesson.session_id}/actions`,
      body: { request_id: createQuizSubmissionId(), revision: lesson.revision, action, language, ...(action === "question" ? { text } : {}) },
    };
    pending.current = request;
    inFlight.current = true; setBusy(true); setError("");
    try {
      const next = await read<LearningSession>(await fetch(request.path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request.body) }));
      pending.current = null; setUncertain(false); accept(next, true);
      if (request.body.action === "question") { setLastQuestion(String(request.body.text)); setDraft(""); }
      else setLastQuestion("");
    } catch (caught) {
      const status = caught && typeof caught === "object" && "status" in caught ? Number(caught.status) : 503;
      if ([400, 401, 403, 404, 409, 422].includes(status)) { pending.current = null; setUncertain(false); }
      else setUncertain(true);
      setError(caught instanceof Error ? caught.message : t("Tindakan belum dapat dipastikan."));
      if (status === 409) {
        try { accept(await read<LearningSession>(await fetch(`/api/learning/sessions/${lesson.session_id}`, { cache: "no-store" }))); } catch { /* Preserve the error and let the student reopen the source. */ }
      }
    } finally { inFlight.current = false; setBusy(false); }
  }

  return <div className="guided-workspace">
    <aside className="guided-sidebar">
      <Card className="guided-material-picker">
        <CardHeader><BookOpen size={22} aria-hidden="true" /><CardTitle><UiText>{"Materi belajarmu"}</UiText></CardTitle><CardDescription><UiText>{"Pilih materi, lalu Tutor akan mengajarkannya secara bertahap."}</UiText></CardDescription></CardHeader>
        <CardContent><label className="field"><UiText>{"Materi belajar"}</UiText><select value={materialId} onChange={(event) => setMaterialId(event.target.value)} disabled={busy || locked || uncertain}>
          <option value=""><UiText>{"Pilih materi"}</UiText></option>
          {materials.map((row) => <option key={row.id} value={row.id}>{row.subject} · {row.title}</option>)}
        </select></label>
        {selected && !ready && <p className="info-note" role="status"><UiText>{"Materi sedang disiapkan. Coba lagi setelah guru selesai memprosesnya."}</UiText></p>}
        {!materials.length && <p className="info-note"><UiText>{"Minta guru membagikan materi di kelasmu untuk mulai belajar."}</UiText></p>}
        <Button type="button" onClick={() => void begin()} disabled={busy || locked || uncertain || !ready}>{busy ? <LoaderCircle className="spin" size={17} aria-hidden="true" /> : <Headphones size={17} aria-hidden="true" />}<UiText>{"Mulai belajar"}</UiText></Button>
        </CardContent>
      </Card>
      {!!sessions.length && <Card className="guided-sessions"><CardTitle><UiText>{"Lanjutkan sesi"}</UiText></CardTitle>
        <ul>{sessions.filter((row) => row.phase !== "completed").map((row) => <li key={row.session_id}><button type="button" onClick={() => void recover(row.session_id)} disabled={busy || uncertain || (locked && row.session_id !== lesson?.session_id)} aria-current={lesson?.session_id === row.session_id ? "true" : undefined}>
          <span>{row.material_title}</span><small>{row.phase === "quiz" ? t("Mini kuis berjalan") : `${t("Bagian")} ${row.unit_index + 1} / ${row.total_units}`}</small></button></li>)}</ul>
      </Card>}
      <div className="guided-other-paths"><Link href="/siswa/latihan"><UiText>{"Asesmen mandiri"}</UiText><ArrowRight size={16} aria-hidden="true" /></Link><Link href="/siswa/tugas"><UiText>{"Tugas"}</UiText><ArrowRight size={16} aria-hidden="true" /></Link></div>
    </aside>
    <div className="guided-main" aria-busy={busy}>
      {error && <div className="alert error-message" role="alert"><p>{t(error)}</p>{uncertain && <Button type="button" variant="outline" disabled={busy} onClick={() => void act("repeat", true)}><UiText>{"Coba kirim kembali"}</UiText></Button>}</div>}
      {!lesson ? <Card className="guided-welcome"><span className="guided-symbol"><Headphones size={32} aria-hidden="true" /></span><CardTitle><UiText>{"Belajar bersama Tutor"}</UiText></CardTitle><CardDescription><UiText>{"Dengarkan penjelasan, tanyakan yang belum jelas, lalu cek pemahamanmu. Kamu bisa melanjutkan sesi kapan saja."}</UiText></CardDescription><ol><li><UiText>{"Pilih materi dari kelasmu"}</UiText></li><li><UiText>{"Pelajari satu bagian bersama Tutor"}</UiText></li><li><UiText>{"Lanjut belajar atau coba mini kuis"}</UiText></li></ol></Card> : <>
        <Card className="guided-progress"><div><span className="muted">{lesson.subject}</span><h2>{lesson.material_title}</h2></div><strong>{t("Bagian")} {lesson.unit_index + 1} / {lesson.total_units}</strong><progress value={lesson.phase === "completed" ? lesson.total_units : lesson.unit_index + 1} max={lesson.total_units} aria-label={t("Progres belajar")} /></Card>
        {lesson.phase === "quiz" && lesson.quiz ? (
          <div className="guided-quiz-container">
            <div className="guided-quiz-banner" role="status">
              <Sparkles size={18} aria-hidden="true" />
              <span>{t("Mini kuis materi")} · {lesson.material_title}</span>
            </div>
            <StudentQuiz key={lesson.quiz.quiz_session_id} embedded initialSession={lesson.quiz} onReturn={() => void recover(lesson.session_id)} />
          </div>
        ) : <Card className="guided-lesson">
          <header className="guided-lesson-heading"><span className="guided-symbol"><Headphones size={24} aria-hidden="true" /></span><h2 ref={explanation} tabIndex={-1}>{lesson.unit_title || `${t("Bagian")} ${lesson.unit_index + 1}`}</h2></header>
          {lastQuestion && <div className="guided-your-question"><strong><UiText>{"Pertanyaanmu"}</UiText></strong><p>{lastQuestion}</p></div>}
          <div className="guided-explanation" role="region" aria-label={t("Penjelasan Tutor")}><p>{lesson.text}</p></div>
          <VoiceControls text={lesson.text} language={lesson.language} autoPlayKey={autoPlayKey} onTranscript={lesson.phase === "learning" && !busy && !uncertain ? setDraft : undefined} />
          <Link className="guided-source" href={`/siswa/kelas/${lesson.class_id}/materi/${lesson.material_id}`}><BookOpen size={16} aria-hidden="true" /><UiText>{"Buka materi sumber"}</UiText>{lesson.source_filename ? `: ${lesson.source_filename}` : ""}</Link>
          {lesson.quiz?.status === "completed" && <div className="guided-check-result" role="status"><CheckCircle2 size={20} aria-hidden="true" /><div><strong><UiText>{"Mini kuis selesai"}</UiText> · {Math.round((lesson.quiz.last_result?.cumulative_score ?? 0) * 100)}%</strong><p>{lesson.quiz.last_result?.feedback}</p></div></div>}
          {lesson.phase === "learning" ? <>
            <form onSubmit={(event) => { event.preventDefault(); void act("question"); }} className="guided-question-form"><label className="field"><UiText>{"Ada yang belum jelas?"}</UiText><textarea value={draft} maxLength={4000} rows={3} onChange={(event) => setDraft(event.target.value)} disabled={busy || uncertain} placeholder={t("Tuliskan pertanyaan atau gunakan tombol suara.")} /></label><Button type="submit" disabled={busy || uncertain || !draft.trim()}><Send size={17} aria-hidden="true" /><UiText>{"Tanyakan pada Tutor"}</UiText></Button></form>
            <footer className="guided-actions" aria-label={t("Langkah belajar berikutnya")}>{Object.entries(actions).filter(([action]) => lesson.available_actions.includes(action)).map(([action, { label, Icon }]) => <Button key={action} type="button" variant={action === "continue" || action === "finish" ? "default" : "outline"} disabled={busy || uncertain} onClick={() => void act(action)}><Icon size={17} aria-hidden="true" />{t(label)}</Button>)}</footer>
          </> : <div className="guided-check-result" role="status"><CheckCircle2 size={20} aria-hidden="true" /><UiText>{"Sesi belajar selesai. Pilih materi lain untuk melanjutkan."}</UiText></div>}
        </Card>}
      </>}
    </div>
  </div>;
}
