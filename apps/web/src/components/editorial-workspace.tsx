"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Check,
  CheckCircle2,
  FileCheck2,
  Plus,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import type { Classroom } from "@/lib/class-types";
import { editorialRequest } from "@/lib/editorial-client";
import { createQuizSubmissionId } from "@/lib/quiz-submission.mjs";
import {
  eventLabel,
  quizState,
  scheduleLabel,
  type Assignment,
  type EditableQuestion,
  type QuizDraft,
  type Reviewer,
  type Subject,
} from "@/lib/editorial-types";
import { confirmAction, notifyResult } from "@/lib/dialogs";
import { Badge } from "./ui";
import "@/styles/editorial.css";

const blankQuestion = (order_index: number): EditableQuestion => ({
  order_index,
  prompt: "",
  narration: "",
  options: [
    { id: "a", label: "" },
    { id: "b", label: "" },
  ],
  correct_option_id: "a",
  explanation: "",
  difficulty: "medium",
  concept_id: null,
});
const editable = (draft: QuizDraft): EditableQuestion[] =>
  draft.version.questions.map((q) => ({
    order_index: q.order_index,
    prompt: q.prompt,
    narration: q.narration,
    options: q.options,
    correct_option_id: q.correct_option_id,
    explanation: q.explanation,
    difficulty: q.difficulty,
    concept_id: q.concept_id,
  }));

export function QuizWorkspace({
  initial = null,
  subjects = [],
  classes = [],
  reviewers = [],
  mode = "owner",
  admin = false,
}: {
  initial?: QuizDraft | null;
  subjects?: Subject[];
  classes?: Classroom[];
  reviewers?: Reviewer[];
  mode?: "owner" | "review";
  admin?: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [title, setTitle] = useState(initial?.version.title ?? "");
  const [description, setDescription] = useState(
    initial?.version.description ?? "",
  );
  const [subjectId, setSubjectId] = useState(
    initial?.version.subject_id ?? subjects[0]?.id ?? "",
  );
  const [subjectRows, setSubjectRows] = useState(subjects);
  const [newSubject, setNewSubject] = useState("");
  const [items, setItems] = useState<EditableQuestion[]>(
    initial ? editable(initial) : [blankQuestion(1)],
  );
  const [release, setRelease] = useState<"after_submission" | "after_due">(
    initial?.version.release_policy ?? "after_submission",
  );
  const [reviewer, setReviewer] = useState(initial?.version.reviewer_id ?? "");
  const [note, setNote] = useState("");
  const [classId, setClassId] = useState(
    classes.find((c) => !c.is_archived)?.id ?? "",
  );
  const [opens, setOpens] = useState("");
  const [due, setDue] = useState("");
  const [dirty, setDirty] = useState(!initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const owner = mode === "owner";
  const state = draft?.version.state ?? "draft";
  const action = () => ({
    version_id: draft!.version.id,
    expected_review_revision: draft!.version.review_revision,
  });

  function accept(next: QuizDraft) {
    setDraft(next);
    setTitle(next.version.title);
    setDescription(next.version.description);
    setSubjectId(next.version.subject_id);
    setRelease(next.version.release_policy);
    setItems(editable(next));
    setReviewer(next.version.reviewer_id ?? "");
    setDirty(false);
  }
  async function run(
    heading: string,
    text: string,
    work: () => Promise<void>,
    success: string,
  ) {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      if (
        !(await confirmAction({
          title: heading,
          text,
          confirmText: "Ya, lanjutkan",
        }))
      )
        return;
      setBusy(true);
      setError("");
      await work();
      setMessage(success);
      await notifyResult(success);
    } catch (caught) {
      const text =
        caught instanceof Error ? caught.message : "Perubahan belum tersimpan.";
      setError(text);
      await notifyResult(text, true);
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }
  function change(index: number, patch: Partial<EditableQuestion>) {
    setItems((rows) =>
      rows.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    );
    setDirty(true);
  }
  function move(index: number, direction: number) {
    setItems((rows) => {
      const next = [...rows];
      [next[index], next[index + direction]] = [
        next[index + direction],
        next[index],
      ];
      return next.map((q, i) => ({ ...q, order_index: i + 1 }));
    });
    setDirty(true);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    await run(
      "Simpan revisi kuis?",
      "Isi soal disimpan sebagai revisi baru. Revisi yang telah ditugaskan tetap utuh.",
      async () => {
        const payload = {
          subject_id: subjectId,
          title,
          description,
          release_policy: release,
          questions: items,
        };
        const next = await editorialRequest<QuizDraft>(
          draft ? `/teacher/quizzes/${draft.id}` : "/teacher/quizzes",
          draft ? "PATCH" : "POST",
          {
            ...payload,
            ...(draft ? { expected_version: draft.current_version } : {}),
          },
        );
        accept(next);
        if (!draft) router.replace(`/guru/kuis/${next.id}`);
      },
      "Revisi disimpan. Pilih reviewer, lalu ajukan untuk review.",
    );
  }
  async function transition(
    name: string,
    heading: string,
    text: string,
    extra: Record<string, unknown> = {},
  ) {
    await run(
      heading,
      text,
      async () => {
        accept(
          await editorialRequest<QuizDraft>(
            `/teacher/quizzes/${draft!.id}/${name}`,
            "POST",
            { ...action(), ...extra },
          ),
        );
      },
      "Status kuis berhasil diperbarui.",
    );
  }

  return (
    <>
      <div className="editorial-status-bar">
        <Badge active={state !== "rejected"}>{quizState[state]}</Badge>
        <span>
          Revisi {draft?.current_version ?? 1} · {items.length} soal
        </span>
        <span className={dirty ? "editorial-unsaved" : ""}>
          {dirty ? "Perubahan belum disimpan" : "Isi sudah tersimpan"}
        </span>
      </div>
      {error && (
        <p className="editorial-error" role="alert">
          {error}{" "}
          <button
            type="button"
            className="button secondary small"
            onClick={() => router.refresh()}
          >
            Muat ulang halaman
          </button>
        </p>
      )}
      <p className="editorial-live" role="status" aria-live="polite">
        {message}
      </p>
      <div className="editorial-grid">
        <div className="editorial-main">
          {owner ? (
            <form onSubmit={save} className="editorial-form">
              <section className="panel editorial-section">
                <div className="editorial-section-title">
                  <span className="editorial-number">01</span>
                  <div>
                    <h2>Identitas kuis</h2>
                    <p>Berikan konteks yang jelas sebelum siswa mulai.</p>
                  </div>
                </div>
                <label className="field">
                  Judul kuis
                  <input
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setDirty(true);
                    }}
                    required
                    maxLength={200}
                    disabled={busy}
                    placeholder="Contoh: Memahami pecahan di sekitar kita"
                  />
                </label>
                <label className="field">
                  Deskripsi
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      setDirty(true);
                    }}
                    maxLength={2000}
                    disabled={busy}
                    placeholder="Apa yang akan dipelajari siswa?"
                  />
                </label>
                <div className="editorial-two-fields">
                  <label className="field">
                    Mata pelajaran
                    <select
                      value={subjectId}
                      onChange={(e) => {
                        setSubjectId(e.target.value);
                        setItems((qs) =>
                          qs.map((q) => ({ ...q, concept_id: null })),
                        );
                        setDirty(true);
                      }}
                      required
                      disabled={busy}
                    >
                      <option value="">Pilih mata pelajaran</option>
                      {subjectRows.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    Pembahasan untuk siswa
                    <select
                      value={release}
                      onChange={(e) => {
                        setRelease(e.target.value as typeof release);
                        setDirty(true);
                      }}
                      disabled={busy}
                    >
                      <option value="after_submission">
                        Setelah jawaban dikirim
                      </option>
                      <option value="after_due">
                        Setelah batas pengumpulan
                      </option>
                    </select>
                  </label>
                </div>
                <details className="editorial-details">
                  <summary>Tambah mata pelajaran</summary>
                  <label className="field">
                    Nama mata pelajaran baru
                    <input
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      maxLength={120}
                      disabled={busy}
                    />
                  </label>
                  <button
                    type="button"
                    className="button secondary small"
                    disabled={busy || !newSubject.trim()}
                    onClick={() =>
                      void run(
                        "Tambah mata pelajaran?",
                        "Mata pelajaran ini akan tersedia dalam katalog pembelajaran.",
                        async () => {
                          const row = await editorialRequest<Subject>(
                            "/subjects",
                            "POST",
                            { name: newSubject.trim() },
                          );
                          setSubjectRows((rows) => [...rows, row]);
                          setSubjectId(row.id);
                          setItems((qs) =>
                            qs.map((q) => ({ ...q, concept_id: null })),
                          );
                          setNewSubject("");
                          setDirty(true);
                        },
                        "Mata pelajaran ditambahkan.",
                      )
                    }
                  >
                    Tambah mata pelajaran
                  </button>
                </details>
              </section>
              <section className="panel editorial-section">
                <div className="editorial-section-title">
                  <span className="editorial-number">02</span>
                  <div>
                    <h2>Soal & pembahasan</h2>
                    <p>
                      Pilihan ganda yang ringkas, jelas, dan nyaman dibacakan.
                    </p>
                  </div>
                </div>
                {items.map((q, index) => (
                  <fieldset className="editorial-question" key={index}>
                    <legend>Soal {index + 1}</legend>
                    <div className="editorial-question-tools">
                      <button
                        type="button"
                        className="editorial-icon-button"
                        aria-label={`Naikkan soal ${index + 1}`}
                        disabled={busy || index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="editorial-icon-button"
                        aria-label={`Turunkan soal ${index + 1}`}
                        disabled={busy || index === items.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="editorial-icon-button editorial-delete"
                        aria-label={`Hapus soal ${index + 1}`}
                        disabled={busy || items.length === 1}
                        onClick={async () => {
                          if (
                            await confirmAction({
                              title: `Hapus soal ${index + 1}?`,
                              text: "Perubahan ini diterapkan pada revisi yang sedang Anda edit.",
                              destructive: true,
                            })
                          ) {
                            setItems((rows) =>
                              rows
                                .filter((_, i) => i !== index)
                                .map((item, i) => ({
                                  ...item,
                                  order_index: i + 1,
                                })),
                            );
                            setDirty(true);
                          }
                        }}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                    <label className="field">
                      Pertanyaan
                      <textarea
                        rows={3}
                        value={q.prompt}
                        onChange={(e) =>
                          change(index, { prompt: e.target.value })
                        }
                        required
                        maxLength={4000}
                        disabled={busy}
                      />
                    </label>
                    <div className="editorial-option-help">
                      Pilih satu kunci jawaban. Kunci hanya terlihat oleh guru
                      dan reviewer sebelum pembahasan dirilis.
                    </div>
                    <fieldset className="editorial-options">
                      <legend>Kunci dan pilihan soal {index + 1}</legend>
                      {q.options.map((option, oi) => (
                        <div className="editorial-option" key={option.id}>
                          <label className="editorial-key">
                            <input
                              type="radio"
                              name={`correct-${index}`}
                              checked={q.correct_option_id === option.id}
                              onChange={() =>
                                change(index, { correct_option_id: option.id })
                              }
                              disabled={busy}
                              aria-label={`Kunci jawaban pilihan ${String.fromCharCode(65 + oi)} soal ${index + 1}`}
                            />
                            <span>{String.fromCharCode(65 + oi)}</span>
                          </label>
                          <label className="field">
                            <span className="sr-only">
                              Isi pilihan {String.fromCharCode(65 + oi)} soal{" "}
                              {index + 1}
                            </span>
                            <input
                              value={option.label}
                              required
                              maxLength={1000}
                              disabled={busy}
                              placeholder={`Pilihan ${String.fromCharCode(65 + oi)}`}
                              onChange={(e) =>
                                change(index, {
                                  options: q.options.map((o) =>
                                    o.id === option.id
                                      ? { ...o, label: e.target.value }
                                      : o,
                                  ),
                                })
                              }
                            />
                          </label>
                          <button
                            type="button"
                            className="editorial-icon-button"
                            aria-label={`Hapus pilihan ${String.fromCharCode(65 + oi)} soal ${index + 1}`}
                            disabled={busy || q.options.length <= 2}
                            onClick={async () => {
                              if (
                                await confirmAction({
                                  title: "Hapus pilihan jawaban?",
                                  text: "Jika pilihan ini adalah kunci, pilih kembali kunci jawaban yang benar.",
                                  destructive: true,
                                })
                              ) {
                                const options = q.options.filter(
                                  (o) => o.id !== option.id,
                                );
                                change(index, {
                                  options,
                                  correct_option_id:
                                    q.correct_option_id === option.id
                                      ? options[0].id
                                      : q.correct_option_id,
                                });
                              }
                            }}
                          >
                            <Trash2 size={15} aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </fieldset>
                    <button
                      type="button"
                      className="button secondary small"
                      disabled={busy || q.options.length >= 6}
                      onClick={() =>
                        change(index, {
                          options: [
                            ...q.options,
                            { id: createQuizSubmissionId(), label: "" },
                          ],
                        })
                      }
                    >
                      <Plus size={15} aria-hidden="true" /> Tambah pilihan
                    </button>
                    <label className="field">
                      Pembahasan
                      <textarea
                        rows={3}
                        maxLength={4000}
                        value={q.explanation}
                        onChange={(e) =>
                          change(index, { explanation: e.target.value })
                        }
                        disabled={busy}
                        placeholder="Jelaskan alasan jawaban benar dengan bahasa sederhana."
                      />
                    </label>
                    <div className="editorial-two-fields">
                      <label className="field">
                        Tingkat kesulitan
                        <select
                          value={q.difficulty}
                          onChange={(e) =>
                            change(index, {
                              difficulty: e.target
                                .value as EditableQuestion["difficulty"],
                            })
                          }
                          disabled={busy}
                        >
                          <option value="easy">Mudah</option>
                          <option value="medium">Sedang</option>
                          <option value="hard">Sulit</option>
                        </select>
                      </label>
                      <span className="editorial-help">
                        Nilai setiap soal berbobot sama. Belum ada batas waktu
                        per soal.
                      </span>
                    </div>
                    <details className="editorial-details">
                      <summary>Narasi alternatif untuk audio</summary>
                      <label className="field">
                        Narasi soal
                        <textarea
                          rows={3}
                          maxLength={6000}
                          value={q.narration}
                          onChange={(e) =>
                            change(index, { narration: e.target.value })
                          }
                          disabled={busy}
                          placeholder="Opsional. Tulis simbol atau rumus menjadi kalimat yang mudah didengar."
                        />
                      </label>
                    </details>
                  </fieldset>
                ))}
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy || items.length >= 20}
                  onClick={() => {
                    setItems((rows) => [
                      ...rows,
                      blankQuestion(rows.length + 1),
                    ]);
                    setDirty(true);
                  }}
                >
                  <Plus size={17} aria-hidden="true" /> Tambah soal{" "}
                  <span className="muted">{items.length}/20</span>
                </button>
              </section>
              <div className="editorial-save-bar">
                <span>
                  {dirty
                    ? "Simpan perubahan sebelum mengajukan review."
                    : "Anda dapat menyiapkan revisi berikutnya kapan saja."}
                </span>
                <button
                  className="button primary"
                  disabled={busy || !subjectId || !dirty}
                >
                  <Save size={17} aria-hidden="true" />{" "}
                  {busy
                    ? "Menyimpan…"
                    : draft
                      ? "Simpan revisi baru"
                      : "Simpan draft"}
                </button>
              </div>
            </form>
          ) : (
            <section className="panel editorial-section">
              <div className="editorial-section-title">
                <FileCheck2 size={24} aria-hidden="true" />
                <div>
                  <h2>Pratinjau revisi {draft?.current_version}</h2>
                  <p>
                    {description ||
                      "Periksa pertanyaan, kunci, dan pembahasan sebelum mengambil keputusan."}
                  </p>
                </div>
              </div>
              {draft?.version.questions.map((q) => (
                <article className="editorial-review-question" key={q.id}>
                  <span className="editorial-kicker">
                    SOAL {q.order_index} ·{" "}
                    {q.difficulty === "easy"
                      ? "MUDAH"
                      : q.difficulty === "hard"
                        ? "SULIT"
                        : "SEDANG"}
                  </span>
                  <h3>{q.prompt}</h3>
                  <ol type="A" className="editorial-review-options">
                    {q.options.map((o) => (
                      <li
                        key={o.id}
                        className={
                          o.id === q.correct_option_id ? "correct" : ""
                        }
                      >
                        {o.label}
                        {o.id === q.correct_option_id && (
                          <span>
                            <Check size={15} aria-hidden="true" /> Kunci jawaban
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                  <p>
                    <strong>Pembahasan:</strong>{" "}
                    {q.explanation || "Belum ditulis."}
                  </p>
                  {q.narration && (
                    <p>
                      <strong>Narasi:</strong> {q.narration}
                    </p>
                  )}
                </article>
              ))}
            </section>
          )}
          {owner && draft && (
            <section className="panel editorial-section">
              <div className="editorial-section-title">
                <span className="editorial-number">03</span>
                <div>
                  <h2>Penugasan kelas</h2>
                  <p>
                    Versi terbit dibagikan ke siswa yang menjadi anggota kelas.
                  </p>
                </div>
              </div>
              {state === "published" ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void run(
                      "Tugaskan kuis ke kelas?",
                      "Siswa mendapat satu percobaan. Periksa kelas dan jadwal sebelum melanjutkan.",
                      async () => {
                        const assigned = await editorialRequest<Assignment>(
                          `/teacher/quizzes/${draft.id}/assignments`,
                          "POST",
                          {
                            version_id: draft.version.id,
                            class_id: classId,
                            opens_at: opens
                              ? new Date(opens).toISOString()
                              : null,
                            due_at: due ? new Date(due).toISOString() : null,
                          },
                        );
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                assignments: [assigned, ...current.assignments],
                              }
                            : current,
                        );
                      },
                      "Kuis berhasil ditugaskan ke kelas.",
                    );
                  }}
                  className="editorial-assignment-form"
                >
                  <label className="field">
                    Kelas tujuan
                    <select
                      required
                      value={classId}
                      onChange={(e) => setClassId(e.target.value)}
                      disabled={busy || dirty}
                    >
                      <option value="">Pilih kelas aktif</option>
                      {classes
                        .filter((c) => !c.is_archived)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} · {c.subject}
                          </option>
                        ))}
                    </select>
                  </label>
                  <div className="editorial-two-fields">
                    <label className="field">
                      Dibuka pada (waktu perangkat)
                      <input
                        type="datetime-local"
                        value={opens}
                        onChange={(e) => setOpens(e.target.value)}
                        disabled={busy || dirty}
                      />
                    </label>
                    <label className="field">
                      Batas pengumpulan (waktu perangkat)
                      <input
                        type="datetime-local"
                        value={due}
                        onChange={(e) => setDue(e.target.value)}
                        required={release === "after_due"}
                        disabled={busy || dirty}
                      />
                    </label>
                  </div>
                  <p className="editorial-help">
                    Kosongkan jadwal untuk langsung dibuka tanpa tenggat.
                    Pembahasan setelah tenggat membutuhkan batas pengumpulan.
                  </p>
                  <button
                    className="button primary"
                    disabled={busy || dirty || !classId}
                  >
                    <Send size={16} aria-hidden="true" /> Bagikan ke kelas
                  </button>
                  {!classes.some((c) => !c.is_archived) && (
                    <Link className="learning-back" href="/guru/kelas/baru">
                      Buat kelas aktif terlebih dahulu{" "}
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </Link>
                  )}
                </form>
              ) : (
                <p className="info-note">
                  Penugasan tersedia setelah revisi ini disetujui dan
                  diterbitkan.
                </p>
              )}
              <div className="editorial-assignment-list">
                {draft.assignments.map((a) => (
                  <Link
                    key={a.id}
                    className="editorial-assignment-row"
                    href={`/guru/penugasan/${a.id}`}
                  >
                    <span>
                      <strong>{a.class_name}</strong>
                      <small>
                        Revisi {a.version} ·{" "}
                        {a.is_closed
                          ? "Ditutup"
                          : "Tenggat: " + scheduleLabel(a.due_at)}
                      </small>
                    </span>
                    <span>
                      Lihat hasil <ArrowUpRight size={17} aria-hidden="true" />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
        <aside className="editorial-aside">
          <section className="panel editorial-section editorial-lifecycle">
            <h2>Langkah publikasi</h2>
            <ol>
              {[
                "Tulis & simpan draft",
                "Review oleh guru lain / admin",
                "Terbitkan revisi disetujui",
                "Tugaskan ke kelas",
              ].map((label, index) => (
                <li
                  key={label}
                  className={
                    index <
                    (state === "published"
                      ? 3
                      : state === "approved"
                        ? 2
                        : state === "in_review"
                          ? 1
                          : 0)
                      ? "done"
                      : ""
                  }
                >
                  <span>{index + 1}</span>
                  {label}
                </li>
              ))}
            </ol>
            {owner ? (
              <div className="editorial-lifecycle-actions">
                <label className="field">
                  Reviewer
                  <select
                    value={reviewer}
                    onChange={(e) => setReviewer(e.target.value)}
                    disabled={busy || dirty || state !== "draft"}
                  >
                    <option value="">Antrean admin</option>
                    {reviewers
                      .filter((r) => r.id !== draft?.teacher_id)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.full_name}
                        </option>
                      ))}
                  </select>
                </label>
                {draft && state === "draft" && (
                  <>
                    <button
                      className="button secondary"
                      type="button"
                      disabled={
                        busy ||
                        dirty ||
                        (draft.version.reviewer_id ?? "") === reviewer
                      }
                      onClick={() =>
                        void transition(
                          "reviewer",
                          "Simpan pilihan reviewer?",
                          "Guru reviewer hanya dapat menilai isi kuis, tanpa melihat data siswa.",
                          { reviewer_id: reviewer || null },
                        )
                      }
                    >
                      Simpan reviewer
                    </button>
                    <button
                      className="button primary"
                      type="button"
                      disabled={
                        busy ||
                        dirty ||
                        (draft.version.reviewer_id ?? "") !== reviewer
                      }
                      onClick={() =>
                        void transition(
                          "submit-review",
                          "Ajukan revisi untuk review?",
                          "Reviewer akan memeriksa revisi yang saat ini tersimpan.",
                        )
                      }
                    >
                      <Send size={16} aria-hidden="true" /> Ajukan review
                    </button>
                  </>
                )}
                {draft && state === "approved" && (
                  <button
                    className="button primary"
                    type="button"
                    disabled={busy || dirty}
                    onClick={() =>
                      void transition(
                        "publish",
                        "Terbitkan kuis?",
                        "Revisi yang disetujui siap dibagikan sebagai penugasan kelas.",
                      )
                    }
                  >
                    <CheckCircle2 size={17} aria-hidden="true" /> Terbitkan kuis
                  </button>
                )}
                {!draft && (
                  <p className="editorial-help">
                    Simpan draft pertama untuk mulai review.
                  </p>
                )}
                {["in_review", "rejected"].includes(state) && (
                  <p className="editorial-help">
                    {state === "in_review"
                      ? "Sedang menunggu keputusan reviewer. Perubahan isi akan menjadi revisi baru."
                      : "Periksa catatan di bawah, perbaiki isi, lalu simpan dan ajukan revisi baru."}
                  </p>
                )}
              </div>
            ) : (
              <div className="editorial-lifecycle-actions">
                <label className="field">
                  Catatan review
                  <textarea
                    rows={4}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={2000}
                    disabled={busy || state !== "in_review"}
                    placeholder="Wajib diisi jika meminta perbaikan."
                  />
                </label>
                <button
                  type="button"
                  className="button primary"
                  disabled={busy || state !== "in_review"}
                  onClick={() =>
                    void transition(
                      "approve",
                      "Setujui revisi kuis?",
                      "Pastikan semua kunci dan pembahasan sudah benar. Pemilik tetap harus menerbitkan kuis.",
                      { note },
                    )
                  }
                >
                  <CheckCircle2 size={16} aria-hidden="true" /> Setujui revisi
                </button>
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy || state !== "in_review" || !note.trim()}
                  onClick={() =>
                    void transition(
                      "reject",
                      "Minta perbaikan kuis?",
                      "Catatan Anda disimpan pada revisi ini agar pemilik dapat memperbaikinya.",
                      { note },
                    )
                  }
                >
                  Minta perbaikan
                </button>
                {admin && state === "in_review" && (
                  <details className="editorial-details">
                    <summary>Ganti reviewer</summary>
                    <label className="field">
                      Reviewer pengganti
                      <select
                        value={reviewer}
                        onChange={(e) => setReviewer(e.target.value)}
                        disabled={busy}
                      >
                        <option value="">Antrean admin</option>
                        {reviewers
                          .filter((r) => r.id !== draft?.teacher_id)
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.full_name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="button secondary"
                      disabled={
                        busy || (draft?.version.reviewer_id ?? "") === reviewer
                      }
                      onClick={() =>
                        void transition(
                          "reviewer",
                          "Ganti reviewer revisi ini?",
                          "Akses review guru sebelumnya berakhir. Keputusan dari tab lama akan ditolak.",
                          { reviewer_id: reviewer || null },
                        )
                      }
                    >
                      Ganti reviewer
                    </button>
                  </details>
                )}
              </div>
            )}
          </section>
          {draft && (
            <section className="panel editorial-section">
              <h2>Catatan revisi</h2>
              <ul className="editorial-timeline">
                {draft.events.map((event, i) => (
                  <li key={i}>
                    <strong>{eventLabel[event.kind] || event.kind}</strong>
                    <small>{scheduleLabel(event.created_at)}</small>
                    {event.note && <p>{event.note}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
