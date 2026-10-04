"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Save,
  Send,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { confirmAction, notifyResult } from "@/lib/dialogs";
import { EditorialError, editorialRequest } from "@/lib/editorial-client";
import {
  assignmentAvailability,
  finalIntent,
  isAssignmentReceipt,
} from "@/lib/editorial-contract.mjs";
import { createQuizSubmissionId } from "@/lib/quiz-submission.mjs";
import {
  availabilityLabel,
  scheduleLabel,
  type Assignment,
  type AssignmentAttempt,
  type AssignmentResult,
  type FinalIntent,
} from "@/lib/editorial-types";
import { VoiceControls } from "./voice-controls";
import { Badge } from "./ui";
import "@/styles/editorial.css";

const pendingMemory = new Map<string, string | null>();
const pendingEvent = "kodmod-assignment-pending";
function subscribePending(listener: () => void) {
  window.addEventListener(pendingEvent, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(pendingEvent, listener);
    window.removeEventListener("storage", listener);
  };
}
function readPending(id?: string): string | null {
  if (!id) return null;
  try {
    return (
      sessionStorage.getItem(`kodmod:assignment-final:${id}`) ??
      pendingMemory.get(id) ??
      null
    );
  } catch {
    return pendingMemory.get(id) ?? null;
  }
}
function writePending(id: string, intent: FinalIntent | null) {
  const raw = intent ? JSON.stringify(intent) : null;
  pendingMemory.set(id, raw);
  try {
    if (raw) sessionStorage.setItem(`kodmod:assignment-final:${id}`, raw);
    else sessionStorage.removeItem(`kodmod:assignment-final:${id}`);
  } catch {
    /* In-memory retry remains available if storage is denied. */
  }
  window.dispatchEvent(new Event(pendingEvent));
}
function parsePending(raw: string | null): FinalIntent | null {
  try {
    const p = JSON.parse(raw || "null");
    return p &&
      typeof p.key === "string" &&
      /^[0-9a-f-]{36}$/i.test(p.key) &&
      Number.isSafeInteger(p.expected_revision) &&
      p.expected_revision >= 0
      ? p
      : null;
  } catch {
    return null;
  }
}

export function StudentAssignment({
  assignment,
  initialAttempt,
  initialResult,
}: {
  assignment: Assignment;
  initialAttempt: AssignmentAttempt | null;
  initialResult: AssignmentResult | null;
}) {
  const router = useRouter();
  const [attempt, setAttempt] = useState(initialAttempt);
  const [result, setResult] = useState(initialResult);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(
    initialAttempt
      ? (initialAttempt.answers[initialAttempt.questions[0].id] ?? "")
      : "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const inFlight = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const pending = parsePending(
    useSyncExternalStore(
      subscribePending,
      () => readPending(attempt?.id),
      () => null,
    ),
  );
  const question = attempt?.questions[index];
  const availability = assignmentAvailability(
    attempt?.assignment ?? assignment,
  );
  const saved = attempt && question ? (attempt.answers[question.id] ?? "") : "";
  const dirty = selected !== saved;
  const answeredCount = Object.keys(attempt?.answers ?? {}).length;
  const base = `/student/assignments/${assignment.id}`;

  async function start() {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      if (
        !(await confirmAction({
          title: "Mulai tugas ini?",
          text: "Kamu mendapat satu percobaan. Jawaban yang disimpan bisa dilanjutkan sebelum batas pengumpulan.",
          confirmText: "Mulai mengerjakan",
        }))
      )
        return;
      setBusy(true);
      setError("");
      const next = await editorialRequest<AssignmentAttempt>(
        base + "/start",
        "POST",
      );
      if (next.state === "submitted") {
        setResult(await editorialRequest<AssignmentResult>(base + "/result"));
        return;
      }
      setAttempt(next);
      setIndex(0);
      setSelected(next.answers[next.questions[0].id] ?? "");
      setMessage(
        "Tugas dimulai. Pilih jawaban, lalu simpan untuk melanjutkan.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Tugas belum dapat dimulai.",
      );
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }
  async function save() {
    if (!attempt || !question || !selected || inFlight.current || pending)
      return;
    inFlight.current = true;
    try {
      if (
        !(await confirmAction({
          title: "Simpan pilihan jawaban?",
          text: "Pilihan ini disimpan sebagai progres. Kamu masih bisa mengubahnya sebelum mengirim semua jawaban.",
          confirmText: "Simpan & lanjut",
        }))
      )
        return;
      setBusy(true);
      setError("");
      const next = await editorialRequest<AssignmentAttempt>(
        `${base}/answers/${question.id}`,
        "PUT",
        { option_id: selected, expected_revision: attempt.revision },
      );
      const nextIndex = Math.min(index + 1, next.questions.length - 1);
      setAttempt(next);
      setIndex(nextIndex);
      setSelected(next.answers[next.questions[nextIndex].id] ?? "");
      setMessage(
        `Jawaban soal ${question.order_index} tersimpan. ${Object.keys(next.answers).length} dari ${next.questions.length} soal sudah dijawab.`,
      );
      requestAnimationFrame(() => heading.current?.focus());
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Jawaban belum tersimpan. Muat ulang progres sebelum mencoba kembali.",
      );
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }
  async function navigate(nextIndex: number) {
    if (!attempt || busy || pending) return;
    if (
      dirty &&
      !(await confirmAction({
        title: "Tinggalkan pilihan yang belum disimpan?",
        text: "Pilihan terbaru pada soal ini belum tersimpan. Jawaban yang sebelumnya disimpan tetap ada.",
        destructive: true,
      }))
    )
      return;
    setIndex(nextIndex);
    setSelected(attempt.answers[attempt.questions[nextIndex].id] ?? "");
    requestAnimationFrame(() => heading.current?.focus());
  }
  async function submit() {
    if (!attempt || inFlight.current) return;
    inFlight.current = true;
    try {
      if (
        !pending &&
        !(await confirmAction({
          title: "Kirim semua jawaban?",
          text: "Setelah dikirim, jawaban dinilai dan tidak dapat diubah lagi.",
          confirmText: "Ya, kirim jawaban",
        }))
      )
        return;
      const intent = finalIntent(
        pending,
        attempt.revision,
        createQuizSubmissionId(),
      );
      writePending(attempt.id, intent);
      setBusy(true);
      setError("");
      const next = await editorialRequest<AssignmentResult>(
        base + "/submit",
        "POST",
        { expected_revision: intent.expected_revision },
        intent.key,
      );
      if (!isAssignmentReceipt(next, attempt.id, assignment.id)) {
        throw new Error(
          "Hasil pengiriman belum dapat dibaca. Coba kirim kembali untuk mengambil nilai yang sama.",
        );
      }
      setResult(next);
      writePending(attempt.id, null);
      setMessage("Jawaban berhasil dikirim dan nilai tersimpan.");
      await notifyResult(
        "Tugas selesai. Nilai dan progresmu berhasil tersimpan.",
      );
    } catch (caught) {
      if (
        caught instanceof EditorialError &&
        [400, 401, 403, 404, 409, 422].includes(caught.status)
      )
        writePending(attempt.id, null);
      setError(
        caught instanceof Error
          ? caught.message
          : "Hasil pengiriman belum pasti. Coba kirim kembali.",
      );
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }

  if (result)
    return (
      <div className="editorial-result">
        <section className="panel editorial-result-hero">
          <CheckCircle2 size={36} aria-hidden="true" />
          <span className="editorial-kicker">TUGAS SELESAI</span>
          <h2>Terima kasih sudah mencoba.</h2>
          <div className="editorial-final-score">
            {result.score}
            <span>/100</span>
          </div>
          <p>
            {result.correct_count} dari {result.total_questions} jawaban benar.
          </p>
          <small>Dikirim {scheduleLabel(result.submitted_at)}</small>
        </section>
        {result.feedback_released ? (
          <section className="panel editorial-section">
            <h2>Pembahasan jawaban</h2>
            {result.review.map((r, i) => (
              <article
                key={r.question_id}
                className="editorial-review-question"
              >
                <Badge active={r.is_correct}>
                  {r.is_correct ? "Benar" : "Perlu dipelajari lagi"}
                </Badge>
                <h3>
                  {i + 1}. {r.prompt}
                </h3>
                <p>
                  Jawabanmu:{" "}
                  <strong>
                    {r.options.find((o) => o.id === r.option_id)?.label}
                  </strong>
                </p>
                <p>
                  Jawaban benar:{" "}
                  <strong>
                    {r.options.find((o) => o.id === r.correct_option_id)?.label}
                  </strong>
                </p>
                <p className="editorial-feedback">
                  {r.explanation ||
                    "Guru belum menambahkan pembahasan untuk soal ini."}
                </p>
                <VoiceControls
                  key={r.question_id}
                  text={`${r.prompt}. Jawaban benar: ${r.options.find((o) => o.id === r.correct_option_id)?.label}. ${r.explanation}`}
                />
              </article>
            ))}
          </section>
        ) : (
          <section className="panel editorial-section">
            <h2>Pembahasan menyusul</h2>
            <p>
              Guru akan membuka pembahasan setelah batas pengumpulan:{" "}
              {scheduleLabel(assignment.due_at)}.
            </p>
            <button
              className="button secondary"
              type="button"
              onClick={() => router.refresh()}
            >
              <RefreshCw size={16} aria-hidden="true" /> Periksa pembahasan
            </button>
          </section>
        )}
      </div>
    );

  return (
    <>
      <div className="editorial-status-bar">
        <Badge active={availability === "open"}>
          {availabilityLabel[availability]}
        </Badge>
        <span>Tenggat: {scheduleLabel(assignment.due_at)}</span>
      </div>
      {error && (
        <p role="alert" className="editorial-error">
          {error}{" "}
          <button
            type="button"
            className="button secondary small"
            onClick={() => router.refresh()}
            disabled={busy}
          >
            Muat ulang progres
          </button>
        </p>
      )}
      <p className="editorial-live" role="status" aria-live="polite">
        {message}
      </p>
      {!attempt ? (
        <section className="panel editorial-start">
          <span className="class-symbol">
            <CheckCircle2 size={27} aria-hidden="true" />
          </span>
          <h2>Siap untuk mulai?</h2>
          <p>
            {assignment.description ||
              "Kerjakan sesuai ritmemu. Simpan setiap pilihan untuk melanjutkan dari progres yang sama."}
          </p>
          <ul>
            <li>
              {assignment.total_questions} soal pilihan ganda, satu percobaan.
            </li>
            <li>Jawaban dapat ditinjau kembali sebelum dikirim.</li>
            <li>Tersedia pembacaan soal dan pilihan melalui kontrol suara.</li>
          </ul>
          <button
            type="button"
            className="button primary"
            onClick={() => void start()}
            disabled={busy || availability !== "open"}
          >
            {busy ? "Menyiapkan…" : "Mulai tugas"}
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </section>
      ) : (
        question && (
          <div className="editorial-attempt-grid">
            <aside className="panel editorial-section editorial-progress">
              <h2>Progres tugas</h2>
              <strong>
                {answeredCount}
                <span> / {attempt.questions.length} soal tersimpan</span>
              </strong>
              <progress
                value={answeredCount}
                max={attempt.questions.length}
                aria-label={`${answeredCount} dari ${attempt.questions.length} jawaban tersimpan`}
              />
              <nav
                className="editorial-question-nav"
                aria-label="Pilih nomor soal"
              >
                {attempt.questions.map((q, i) => (
                  <button
                    type="button"
                    key={q.id}
                    onClick={() => void navigate(i)}
                    disabled={busy || !!pending}
                    aria-current={index === i ? "step" : undefined}
                    className={attempt.answers[q.id] ? "answered" : ""}
                    aria-label={`Soal ${q.order_index}${attempt.answers[q.id] ? ", jawaban tersimpan" : ", belum dijawab"}`}
                  >
                    {q.order_index}
                  </button>
                ))}
              </nav>
              <p>Jawaban tersimpan saat kamu menekan Simpan & lanjut.</p>
            </aside>
            <div className="editorial-main">
              <section className="panel editorial-section">
                <span className="editorial-kicker">
                  SOAL {question.order_index} DARI {attempt.questions.length}
                </span>
                <h2
                  ref={heading}
                  tabIndex={-1}
                  className="editorial-student-question"
                >
                  {question.prompt}
                </h2>
                <fieldset
                  className="quiz-options editorial-student-options"
                  disabled={busy || !!pending || availability !== "open"}
                >
                  <legend>Pilih satu jawaban</legend>
                  {question.options.map((o, i) => (
                    <label
                      key={o.id}
                      className={selected === o.id ? "selected" : ""}
                    >
                      <input
                        type="radio"
                        name={`answer-${question.id}`}
                        value={o.id}
                        checked={selected === o.id}
                        onChange={() => setSelected(o.id)}
                      />
                      <span className="quiz-option-key">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span>{o.label}</span>
                    </label>
                  ))}
                </fieldset>
                <p className="editorial-help">
                  {dirty
                    ? "Pilihan terbaru belum disimpan."
                    : saved
                      ? "Pilihan pada soal ini sudah tersimpan."
                      : "Pilih jawaban, lalu simpan untuk melanjutkan."}
                </p>
                <div className="editorial-question-footer">
                  <button
                    type="button"
                    className="button secondary"
                    disabled={index === 0 || busy || !!pending}
                    onClick={() => void navigate(index - 1)}
                  >
                    <ArrowLeft size={16} aria-hidden="true" /> Sebelumnya
                  </button>
                  <button
                    type="button"
                    className="button primary"
                    disabled={
                      !selected || busy || !!pending || availability !== "open"
                    }
                    onClick={() => void save()}
                  >
                    <Save size={16} aria-hidden="true" /> Simpan & lanjut
                  </button>
                </div>
              </section>
              <VoiceControls
                key={question.id}
                text={`Soal ${question.order_index}. ${question.narration || question.prompt}. ${question.options.map((o, i) => `Pilihan ${String.fromCharCode(65 + i)}: ${o.label}`).join(". ")}`}
              />
              <section className="panel editorial-section editorial-final-submit">
                <div>
                  <h2>Tinjau sebelum mengirim</h2>
                  <p>
                    {pending
                      ? "Hasil pengiriman belum pasti. Pilihan dikunci sampai pengiriman ulang selesai; permintaan yang sama tidak akan dinilai dua kali."
                      : "Pastikan semua jawaban sudah tersimpan. Setelah dikirim, jawaban tidak dapat diubah."}
                  </p>
                </div>
                <button
                  type="button"
                  className="button primary"
                  disabled={
                    busy ||
                    (!pending &&
                      (dirty ||
                        answeredCount !== attempt.questions.length ||
                        availability !== "open"))
                  }
                  onClick={() => void submit()}
                >
                  <Send size={17} aria-hidden="true" />{" "}
                  {busy
                    ? "Mengirim…"
                    : pending
                      ? "Coba kirim kembali"
                      : "Kirim semua jawaban"}
                </button>
              </section>
            </div>
          </div>
        )
      )}
    </>
  );
}
