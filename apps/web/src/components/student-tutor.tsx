"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  Bot,
  Clock3,
  LoaderCircle,
  MessageCircle,
  Plus,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { confirmAction, notifyResult } from "@/lib/dialogs";
import type {
  ChatMessageResponse,
  ChatSessionDetail,
  ChatSessionSummary,
  ChatTurn,
} from "@/lib/chat-types";
import { dateLabel } from "@/lib/types";
import { VoiceControls } from "./voice-controls";

const prompts = [
  "Jelaskan materi ini dengan contoh sederhana.",
  "Bantu saya menemukan langkah pertama.",
  "Buatkan latihan singkat dari topik ini.",
];

function textFromResponse(response: Response, fallback: string) {
  return response
    .json()
    .then((body: unknown) => {
      if (typeof body === "object" && body !== null && "message" in body) {
        const message = (body as { message?: unknown }).message;
        if (typeof message === "string" && message) return message;
      }
      return fallback;
    })
    .catch(() => fallback);
}

async function readJson<T>(response: Response, fallback: string) {
  if (!response.ok) throw new Error(await textFromResponse(response, fallback));
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function turnLabel(role: ChatTurn["role"]) {
  return role === "student" ? "Kamu" : role === "system" ? "Info" : "Tutor KODMOD";
}

export function StudentTutor({
  initialSessions,
}: {
  initialSessions: ChatSessionSummary[];
}) {
  const [sessions, setSessions] = useState(initialSessions);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [pendingText, setPendingText] = useState("");
  const [loadingSession, setLoadingSession] = useState(false);
  const [pending, setPending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const selectionRef = useRef(0);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const selectedSession = sessions.find((item) => item.id === selectedId);
  const latestTutorText = [...turns]
    .reverse()
    .find((turn) => turn.role === "assistant" || turn.role === "tutor")?.text ?? "";

  function startNew() {
    selectionRef.current += 1;
    setSelectedId(null);
    setTurns([]);
    setDraft("");
    setError("");
    setNotice("Percakapan baru siap dimulai.");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function loadSession(id: string) {
    const requestId = selectionRef.current + 1;
    selectionRef.current = requestId;
    setSelectedId(id);
    setLoadingSession(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/chat/sessions/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      const detail = await readJson<ChatSessionDetail>(
        response,
        "Riwayat percakapan belum dapat dibuka.",
      );
      if (selectionRef.current === requestId) setTurns(detail.turns);
    } catch (caught) {
      if (selectionRef.current === requestId) {
        setTurns([]);
        setError(caught instanceof Error ? caught.message : "Riwayat belum dapat dibuka.");
      }
    } finally {
      if (selectionRef.current === requestId) setLoadingSession(false);
    }
  }

  async function refreshSessions() {
    const response = await fetch("/api/chat/sessions?limit=50", { cache: "no-store" });
    const next = await readJson<ChatSessionSummary[]>(
      response,
      "Riwayat sesi belum dapat diperbarui.",
    );
    setSessions(next);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || pending || loadingSession) return;
    setPending(true);
    setPendingText(text);
    setDraft("");
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ text, ...(selectedId ? { session_id: selectedId } : {}) }),
      });
      const result = await readJson<ChatMessageResponse>(
        response,
        "Pertanyaan belum dapat dikirim.",
      );
      setTurns((current) => [
        ...current,
        { role: "student", text, timestamp: new Date().toISOString() },
        {
          role: "assistant",
          text: result.text,
          intent: result.intent,
          timestamp: new Date().toISOString(),
        },
      ]);
      setSelectedId(result.session_id);
      try {
        await refreshSessions();
        setNotice("Jawaban tutor sudah siap. Kamu bisa mendengarkannya dengan kontrol suara.");
      } catch {
        setNotice("Jawaban tutor sudah siap. Riwayat akan diperbarui saat kamu memuat ulang halaman.");
      }
    } catch (caught) {
      setDraft(text);
      setError(caught instanceof Error ? caught.message : "Pertanyaan belum dapat dikirim.");
    } finally {
      setPending(false);
      setPendingText("");
    }
  }

  async function removeSession(item: ChatSessionSummary) {
    if (
      !(await confirmAction({
        title: "Hapus percakapan ini?",
        text: "Riwayat pertanyaan dan jawaban di sesi ini akan dihapus dari akunmu.",
        confirmText: "Ya, hapus",
        destructive: true,
      }))
    )
      return;

    setDeletingId(item.id);
    try {
      const response = await fetch(`/api/chat/sessions/${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      });
      await readJson<unknown>(response, "Percakapan belum dapat dihapus.");
    } catch (caught) {
      await notifyResult(
        caught instanceof Error ? caught.message : "Percakapan belum dapat dihapus.",
        true,
      );
      setDeletingId(null);
      return;
    }

    setSessions((current) => current.filter((session) => session.id !== item.id));
    if (selectedId === item.id) startNew();
    setDeletingId(null);
    await notifyResult("Percakapan berhasil dihapus.");
  }

  return (
    <section className="tutor-workspace" aria-label="Tutor AI siswa">
      <aside className="panel tutor-sidebar" aria-label="Riwayat percakapan">
        <div className="tutor-sidebar-heading">
          <div>
            <span className="tutor-kicker">RUANG BELAJAR</span>
            <h2>Riwayat tutor</h2>
          </div>
          <button
            type="button"
            className="icon-button tutor-add"
            onClick={startNew}
            aria-label="Mulai percakapan baru"
            title="Percakapan baru"
          >
            <Plus size={19} aria-hidden="true" />
          </button>
        </div>
        <button type="button" className="button primary tutor-new" onClick={startNew}>
          <MessageCircle size={17} aria-hidden="true" />
          Mulai pertanyaan baru
        </button>
        <div className="tutor-session-list" role="list">
          {sessions.length ? (
            sessions.map((item) => (
              <div
                className={`tutor-session-row ${selectedId === item.id ? "active" : ""}`}
                key={item.id}
                role="listitem"
              >
                <button
                  type="button"
                  className="tutor-session-select"
                  onClick={() => void loadSession(item.id)}
                  aria-current={selectedId === item.id ? "true" : undefined}
                >
                  <strong>{item.title || "Sesi tanpa judul"}</strong>
                  <span>
                    <Clock3 size={13} aria-hidden="true" /> {dateLabel(item.started_at)}
                  </span>
                </button>
                <button
                  type="button"
                  className="icon-button tutor-delete"
                  onClick={() => void removeSession(item)}
                  disabled={deletingId === item.id}
                  aria-label={`Hapus percakapan ${item.title || "tanpa judul"}`}
                  title="Hapus percakapan"
                >
                  {deletingId === item.id ? (
                    <LoaderCircle className="spin" size={16} aria-hidden="true" />
                  ) : (
                    <Trash2 size={16} aria-hidden="true" />
                  )}
                </button>
              </div>
            ))
          ) : (
            <div className="tutor-sidebar-empty">
              <Bot size={22} aria-hidden="true" />
              <p>Belum ada riwayat. Mulai dari pertanyaan sederhana.</p>
            </div>
          )}
        </div>
      </aside>

      <section className="panel tutor-thread" aria-label="Percakapan">
        <header className="tutor-thread-heading">
          <div>
            <span className="tutor-kicker">
              <Sparkles size={14} aria-hidden="true" /> TUTOR ADAPTIF
            </span>
            <h2>{selectedSession?.title || "Mulai dari satu pertanyaan"}</h2>
            <p>
              Tutor membantu menyusun penjelasan. Kamu tetap memegang kendali atas setiap langkah belajar.
            </p>
          </div>
          <span className="tutor-live-status">
            <span aria-hidden="true" /> {pending ? "Menyiapkan jawaban" : "Siap membantu"}
          </span>
        </header>

        <div className="tutor-messages" role="log" aria-live="polite" aria-label="Isi percakapan">
          {loadingSession ? (
            <div className="tutor-empty">
              <LoaderCircle className="spin" size={25} aria-hidden="true" />
              <p>Membuka riwayat percakapan…</p>
            </div>
          ) : !turns.length && !pending ? (
            <div className="tutor-empty">
              <span className="tutor-empty-icon" aria-hidden="true">
                <Bot size={27} />
              </span>
              <h3>Apa yang ingin kamu pahami hari ini?</h3>
              <p>Tuliskan pertanyaanmu dengan kata-kata sendiri. Tutor akan membantumu memecahnya menjadi langkah kecil.</p>
              <div className="tutor-prompts">
                {prompts.map((prompt) => (
                  <button type="button" className="tutor-prompt" key={prompt} onClick={() => setDraft(prompt)}>
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {turns.map((turn, index) => (
                <article className={`tutor-message ${turn.role === "student" ? "student" : "assistant"}`} key={`${turn.timestamp || "turn"}-${index}`}>
                  <span className="tutor-message-avatar" aria-hidden="true">
                    {turn.role === "student" ? "K" : <Bot size={17} />}
                  </span>
                  <div className="tutor-message-content">
                    <span className="tutor-message-label">{turnLabel(turn.role)}</span>
                    <p className="tutor-bubble">{turn.text}</p>
                  </div>
                </article>
              ))}
              {pending && (
                <article className="tutor-message student pending">
                  <span className="tutor-message-avatar" aria-hidden="true">K</span>
                  <div className="tutor-message-content">
                    <span className="tutor-message-label">Kamu</span>
                    <p className="tutor-bubble">{pendingText}</p>
                  </div>
                </article>
              )}
            </>
          )}
        </div>

        <VoiceControls text={latestTutorText} onTranscript={setDraft} />

        <form className="tutor-composer" onSubmit={(event) => void submit(event)}>
          <label className="sr-only" htmlFor="tutor-question">
            Tulis pertanyaan untuk tutor
          </label>
          <textarea
            ref={inputRef}
            id="tutor-question"
            value={draft}
            maxLength={4_000}
            rows={3}
            placeholder="Contoh: Kenapa satu per dua sama dengan dua per empat?"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            disabled={pending || loadingSession}
          />
          <div className="tutor-composer-footer">
            <span>{draft.length}/4.000 karakter · Shift + Enter untuk baris baru</span>
            <button className="button primary" type="submit" disabled={pending || loadingSession || !draft.trim()}>
              {pending ? <LoaderCircle className="spin" size={17} aria-hidden="true" /> : <Send size={17} aria-hidden="true" />}
              {pending ? "Mengirim…" : "Kirim pertanyaan"}
            </button>
          </div>
        </form>
        {error && <p className="alert error-message tutor-feedback" role="alert">{error}</p>}
        {notice && !error && <p className="tutor-feedback" role="status">{notice}</p>}
      </section>
    </section>
  );
}
