"use client";

import { useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Lightbulb, LoaderCircle, RefreshCw, Send, Sparkles, XCircle } from "lucide-react";
import { confirmAction, notifyResult } from "@/lib/dialogs";
import type { QuizQuestion, QuizStartResponse, QuizSubmitResponse } from "@/lib/quiz-types";
import { VoiceControls } from "./voice-controls";

type Phase = "idle" | "starting" | "active" | "submitting" | "review" | "complete";

async function errorText(response: Response, fallback: string) {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "message" in body) {
      const message = (body as { message?: unknown }).message;
      if (typeof message === "string" && message) return message;
    }
  } catch {
    // Keep the safe fallback when the upstream response is not JSON.
  }
  return fallback;
}

async function readJson<T>(response: Response, fallback: string) {
  if (!response.ok) throw new Error(await errorText(response, fallback));
  return (await response.json()) as T;
}

export function StudentQuiz() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [nextQuestion, setNextQuestion] = useState<QuizQuestion | null>(null);
  const [quizSessionId, setQuizSessionId] = useState("");
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [cumulativeScore, setCumulativeScore] = useState(0);
  const [summary, setSummary] = useState("");
  const [count, setCount] = useState("5");
  const [difficulty, setDifficulty] = useState("adaptive");
  const [error, setError] = useState("");
  const questionStartedAt = useRef(0);

  async function startQuiz(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (phase !== "idle") {
      const confirmed = await confirmAction({
        title: "Mulai latihan baru?",
        text: "Latihan yang sedang berjalan akan ditinggalkan dan hasil sementaranya tidak disimpan.",
        confirmText: "Ya, mulai baru",
      });
      if (!confirmed) return;
    }

    setPhase("starting");
    setError("");
    setFeedback("");
    setSummary("");
    setAnswer("");
    setNextQuestion(null);
    try {
      const payload: Record<string, number | string> = { n_questions: Number(count) };
      if (difficulty !== "adaptive") payload.difficulty = difficulty;
      const response = await fetch("/api/quiz/start", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await readJson<QuizStartResponse>(response, "Latihan belum dapat dimulai.");
      setQuizSessionId(result.quiz_session_id);
      setQuestion(result.first_question);
      setTotalQuestions(result.total_questions);
      setCurrentIndex(0);
      questionStartedAt.current = performance.now();
      setPhase("active");
    } catch (caught) {
      setPhase("idle");
      setError(caught instanceof Error ? caught.message : "Latihan belum dapat dimulai.");
    }
  }

  async function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question || !answer.trim() || phase !== "active") return;
    setPhase("submitting");
    setError("");
    try {
      const response = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          quiz_session_id: quizSessionId,
          question_id: question.question_id,
          student_answer: answer.trim(),
          response_latency_ms: Math.max(0, Math.round(performance.now() - questionStartedAt.current)),
        }),
      });
      const result = await readJson<QuizSubmitResponse>(response, "Jawaban belum dapat dinilai.");
      setScore(result.score);
      setCumulativeScore(result.cumulative_score);
      setFeedback(result.feedback);
      setIsCorrect(result.is_correct);
      setNextQuestion(result.next_question);
      setSummary(result.final_summary || "");
      setPhase(result.quiz_complete ? "complete" : "review");
      if (result.quiz_complete) {
        await notifyResult(result.final_summary || "Latihan selesai. Terima kasih sudah mencoba.");
      }
    } catch (caught) {
      setPhase("active");
      setError(caught instanceof Error ? caught.message : "Jawaban belum dapat dinilai.");
    }
  }

  function continueQuiz() {
    if (!nextQuestion) return;
    setQuestion(nextQuestion);
    setNextQuestion(null);
    setCurrentIndex((current) => current + 1);
    setAnswer("");
    setFeedback("");
    setError("");
    questionStartedAt.current = performance.now();
    setPhase("active");
  }

  const progressValue = totalQuestions ? Math.min(currentIndex + (phase === "complete" ? 1 : 0), totalQuestions) : 0;

  return (
    <div className="quiz-shell">
      {(phase === "idle" || phase === "starting") && (
        <section className="panel quiz-start-card">
          <div className="quiz-start-icon" aria-hidden="true">
            <Sparkles size={28} />
          </div>
          <span className="quiz-kicker">LATIHAN ADAPTIF</span>
          <h2>Siap mengecek pemahamanmu?</h2>
          <p>
            Jawab dengan kata-katamu sendiri. Tutor akan memberi umpan balik di setiap langkah, bukan sekadar nilai akhir.
          </p>
          <form className="quiz-settings" onSubmit={(event) => void startQuiz(event)}>
            <label className="field">
              Jumlah soal
              <select value={count} onChange={(event) => setCount(event.target.value)} disabled={phase === "starting"}>
                <option value="3">3 soal · cepat</option>
                <option value="5">5 soal · seimbang</option>
                <option value="10">10 soal · mendalam</option>
              </select>
            </label>
            <label className="field">
              Tingkat tantangan
              <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} disabled={phase === "starting"}>
                <option value="adaptive">Adaptif sesuai progres</option>
                <option value="easy">Santai</option>
                <option value="medium">Seimbang</option>
                <option value="hard">Menantang</option>
              </select>
            </label>
            <button className="button primary quiz-start-button" type="submit" disabled={phase === "starting"}>
              {phase === "starting" ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <Lightbulb size={18} aria-hidden="true" />}
              {phase === "starting" ? "Menyiapkan soal…" : "Mulai latihan"}
            </button>
          </form>
          <ul className="quiz-benefits">
            <li><CheckCircle2 size={17} aria-hidden="true" /> Bisa menjawab lewat teks atau suara.</li>
            <li><CheckCircle2 size={17} aria-hidden="true" /> Feedback diberikan setelah setiap jawaban.</li>
            <li><CheckCircle2 size={17} aria-hidden="true" /> Hasil membantu membentuk rekomendasi belajar.</li>
          </ul>
        </section>
      )}

      {question && phase !== "idle" && phase !== "starting" && (
        <>
          <section className="panel quiz-progress" aria-label="Progres latihan">
            <div>
              <span className="quiz-kicker">PERJALANANMU</span>
              <strong>
                Soal {Math.min(currentIndex + 1, totalQuestions)} dari {totalQuestions}
              </strong>
            </div>
            <span className="quiz-score-label">Skor sementara {Math.round(cumulativeScore * 100)}%</span>
            <progress value={progressValue} max={totalQuestions || 1} aria-label={`Soal ${progressValue} dari ${totalQuestions}`} />
            <button type="button" className="button secondary small" onClick={() => void startQuiz()}>
              <RefreshCw size={16} aria-hidden="true" /> Latihan baru
            </button>
          </section>

          <section className="panel quiz-question-card">
            <div className="quiz-question-meta">
              <span>Soal {currentIndex + 1}</span>
              <span>{question.difficulty === "medium" ? "Seimbang" : question.difficulty}</span>
            </div>
            <h2>{question.question}</h2>
            <VoiceControls text={feedback || question.question} onTranscript={setAnswer} />

            {phase === "active" || phase === "submitting" ? (
              <form className="quiz-answer-form" onSubmit={(event) => void submitAnswer(event)}>
                {question.options.length ? (
                  <fieldset className="quiz-options">
                    <legend>Pilih atau ucapkan jawaban</legend>
                    {question.options.map((option, index) => (
                      <label className={`quiz-option ${answer === option ? "selected" : ""}`} key={option}>
                        <input
                          type="radio"
                          name="quiz-answer"
                          value={option}
                          checked={answer === option}
                          onChange={() => setAnswer(option)}
                          disabled={phase === "submitting"}
                        />
                        <span className="quiz-option-key">{String.fromCharCode(65 + index)}</span>
                        <span>{option}</span>
                      </label>
                    ))}
                  </fieldset>
                ) : (
                  <label className="field quiz-answer-field">
                    Jawabanmu
                    <textarea rows={4} value={answer} onChange={(event) => setAnswer(event.target.value)} disabled={phase === "submitting"} placeholder="Jelaskan dengan kata-katamu sendiri…" />
                  </label>
                )}
                <div className="quiz-answer-footer">
                  <span>{answer.length}/4.000 karakter</span>
                  <button className="button primary" type="submit" disabled={phase === "submitting" || !answer.trim()}>
                    {phase === "submitting" ? <LoaderCircle className="spin" size={17} aria-hidden="true" /> : <Send size={17} aria-hidden="true" />}
                    {phase === "submitting" ? "Menilai…" : "Kirim jawaban"}
                  </button>
                </div>
              </form>
            ) : (
              <section className={`quiz-feedback ${isCorrect ? "correct" : "incorrect"}`} aria-live="polite">
                <div className="quiz-feedback-heading">
                  {isCorrect ? <CheckCircle2 size={22} aria-hidden="true" /> : <XCircle size={22} aria-hidden="true" />}
                  <strong>{isCorrect ? "Jawabanmu tepat" : "Mari kita periksa lagi"}</strong>
                  <span>{Math.round(score * 100)} poin</span>
                </div>
                <p>{feedback}</p>
                {phase === "complete" ? (
                  <div className="quiz-complete-summary">
                    <strong>{summary || "Latihan selesai."}</strong>
                    <button type="button" className="button primary" onClick={() => void startQuiz()}>
                      <RefreshCw size={17} aria-hidden="true" /> Coba lagi
                    </button>
                  </div>
                ) : (
                  <button type="button" className="button primary" onClick={continueQuiz}>
                    Lanjut ke soal berikutnya
                  </button>
                )}
              </section>
            )}
          </section>
        </>
      )}

      {error && <p className="alert error-message quiz-feedback-alert" role="alert">{error}</p>}
    </div>
  );
}
