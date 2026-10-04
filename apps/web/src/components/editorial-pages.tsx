import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpenCheck,
  CalendarClock,
  FileCheck2,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { notFound } from "next/navigation";
import { editorialBackend, editorialData } from "@/lib/editorial-server";
import { backend } from "@/lib/server-api";
import { requireSession } from "@/lib/session";
import type { Classroom } from "@/lib/class-types";
import {
  availabilityLabel,
  quizState,
  scheduleLabel,
  type Assignment,
  type AssignmentAttempt,
  type AssignmentResult,
  type QuizDraft,
  type QuizSummary,
  type Reviewer,
  type Subject,
  type TeacherResults,
} from "@/lib/editorial-types";
import { assignmentAvailability } from "@/lib/editorial-contract.mjs";
import { Badge, Empty, Heading } from "./ui";
import { QuizWorkspace } from "./editorial-workspace";
import { StudentAssignment } from "./student-assignment";
import { AssignmentResults } from "./assignment-results";
import "@/styles/editorial.css";

function pageNumber(value?: string) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0
    ? Math.min(number, 40000)
    : 0;
}
function Pagination({
  page,
  next,
  path,
}: {
  page: number;
  next: boolean;
  path: string;
}) {
  return (
    <nav className="editorial-pagination" aria-label="Halaman daftar">
      {page > 0 && (
        <Link
          className="button secondary small"
          href={`${path}?page=${page - 1}`}
        >
          <ArrowLeft size={16} aria-hidden="true" /> Sebelumnya
        </Link>
      )}
      <span>Halaman {page + 1}</span>
      {next && (
        <Link
          className="button secondary small"
          href={`${path}?page=${page + 1}`}
        >
          Selanjutnya <ArrowRight size={16} aria-hidden="true" />
        </Link>
      )}
    </nav>
  );
}

export async function TeacherQuizIndex({ page: raw }: { page?: string }) {
  const page = pageNumber(raw);
  const rows = await editorialData<QuizSummary[]>(
    `/teacher/quizzes?limit=25&offset=${page * 25}`,
    "teacher",
  );
  return (
    <>
      <Heading
        title="Kuis & penugasan"
        description="Dari pertanyaan yang baik, menuju pemahaman yang lebih terarah."
      >
        <Link className="button primary" href="/guru/kuis/baru">
          <Plus size={17} aria-hidden="true" /> Buat kuis
        </Link>
      </Heading>
      <section className="editorial-hero">
        <div>
          <span className="editorial-kicker">
            <BookOpenCheck size={16} aria-hidden="true" /> RUANG UNTUK MEMAHAMI
          </span>
          <h2>Siapkan. Tinjau. Bagikan.</h2>
          <p>
            Tulis soal dengan pembahasan yang jelas, ajukan review, lalu bagikan
            ke kelas. Jawaban dan nilai siswa tersimpan dalam satu alur.
          </p>
        </div>
        <div className="editorial-hero-steps" aria-label="Alur kuis">
          <span>01 · Draft</span>
          <span>02 · Review</span>
          <span>03 · Publikasi</span>
          <span>04 · Penugasan</span>
        </div>
      </section>
      <div className="learning-section-heading">
        <h2>Kuis Anda</h2>
        <Link className="learning-back" href="/guru/review-kuis">
          Antrean review <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </div>
      {rows.length ? (
        <div className="editorial-card-grid">
          {rows.map((q) => (
            <Link
              className="panel editorial-card"
              href={`/guru/kuis/${q.id}`}
              key={q.id}
            >
              <div className="editorial-card-top">
                <span className="class-symbol">
                  <FileCheck2 size={22} aria-hidden="true" />
                </span>
                <Badge active={q.state !== "rejected"}>
                  {quizState[q.state]}
                </Badge>
              </div>
              <h3>{q.title}</h3>
              <p>
                {q.description ||
                  "Buka kuis untuk menyiapkan soal, pembahasan, dan penugasan."}
              </p>
              <div className="editorial-card-bottom">
                <span>Revisi {q.current_version}</span>
                <span>
                  Kelola kuis <ArrowUpRight size={17} aria-hidden="true" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <section className="panel">
          <Empty title="Mulai dari satu pertanyaan.">
            Buat kuis pilihan ganda, lalu minta review sebelum membagikannya ke
            siswa.
          </Empty>
        </section>
      )}
      <Pagination page={page} next={rows.length === 25} path="/guru/kuis" />
    </>
  );
}

export async function TeacherQuizEditor({ id }: { id?: string }) {
  const { token, user } = await requireSession("teacher");
  const [draft, subjects, classes, reviewers] = await Promise.all([
    id
      ? editorialData<QuizDraft>(`/teacher/quizzes/${id}`, "teacher")
      : Promise.resolve(null),
    backend<Subject[]>("/subjects", token),
    backend<Classroom[]>("/classes", token),
    editorialBackend<Reviewer[]>("/quiz-reviewers", token),
  ]);
  if (draft && draft.teacher_id !== user.id) notFound();
  return (
    <>
      <Link className="learning-back" href="/guru/kuis">
        <ArrowLeft size={16} aria-hidden="true" /> Semua kuis
      </Link>
      <Heading
        title={draft?.version.title || "Buat kuis baru"}
        description="Pertanyaan yang jelas. Review yang terarah. Pengalaman belajar yang nyaman."
      />
      <QuizWorkspace
        key={
          draft
            ? `${draft.id}:${draft.current_version}:${draft.version.review_revision}`
            : "new"
        }
        initial={draft}
        subjects={subjects}
        classes={classes}
        reviewers={reviewers}
      />
    </>
  );
}

export async function QuizReviewIndex({
  role,
  page: raw,
}: {
  role: "teacher" | "admin";
  page?: string;
}) {
  const page = pageNumber(raw),
    base = role === "admin" ? "/admin/review-kuis" : "/guru/review-kuis";
  const rows = await editorialData<QuizSummary[]>(
    `/quiz-reviews?limit=25&offset=${page * 25}`,
    role,
  );
  return (
    <>
      <Heading
        title="Review kuis"
        description={
          role === "admin"
            ? "Pastikan pertanyaan dan pembahasan siap membantu siswa belajar."
            : "Tinjau revisi kuis yang dipercayakan kepada Anda."
        }
      />
      <section className="panel editorial-review-intro">
        <ShieldCheck size={27} aria-hidden="true" />
        <div>
          <h2>Satu revisi. Satu keputusan yang jelas.</h2>
          <p>
            Periksa soal, kunci, dan narasi. Persetujuan memberi guru izin untuk
            menerbitkan revisi tersebut.
          </p>
        </div>
      </section>
      {rows.length ? (
        <div className="editorial-card-grid">
          {rows.map((q) => (
            <Link
              key={q.id}
              className="panel editorial-card"
              href={`${base}/${q.id}`}
            >
              <div className="editorial-card-top">
                <FileCheck2 size={23} aria-hidden="true" />
                <Badge>Menunggu review</Badge>
              </div>
              <h2>{q.title}</h2>
              <p>Disiapkan oleh {q.owner_name}</p>
              <div className="editorial-card-bottom">
                <span>Revisi {q.current_version}</span>
                <span>
                  Tinjau <ArrowUpRight size={17} aria-hidden="true" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <section className="panel">
          <Empty title="Antrean review sudah bersih.">
            Kuis yang menunggu penilaian akan muncul di sini.
          </Empty>
        </section>
      )}
      <Pagination page={page} next={rows.length === 25} path={base} />
    </>
  );
}

export async function QuizReviewDetail({
  id,
  role,
}: {
  id: string;
  role: "teacher" | "admin";
}) {
  const { token, user } = await requireSession(role);
  const draft = await editorialData<QuizDraft>(`/teacher/quizzes/${id}`, role);
  if (draft.teacher_id === user.id) notFound();
  const reviewers =
    role === "admin"
      ? await editorialBackend<Reviewer[]>("/quiz-reviewers", token)
      : [];
  return (
    <>
      <Link
        className="learning-back"
        href={role === "admin" ? "/admin/review-kuis" : "/guru/review-kuis"}
      >
        <ArrowLeft size={16} aria-hidden="true" /> Antrean review
      </Link>
      <Heading
        title={draft.version.title}
        description="Keputusan Anda berlaku untuk revisi yang sedang ditampilkan."
      />
      <QuizWorkspace
        key={`${draft.id}:${draft.current_version}:${draft.version.review_revision}`}
        initial={draft}
        mode="review"
        admin={role === "admin"}
        reviewers={reviewers}
      />
    </>
  );
}

export async function StudentAssignmentIndex({ page: raw }: { page?: string }) {
  const page = pageNumber(raw);
  const rows = await editorialData<Assignment[]>(
    `/student/assignments?limit=25&offset=${page * 25}`,
    "student",
  );
  return (
    <>
      <Heading
        title="Tugas dari guru"
        description="Kerjakan satu langkah pada satu waktu. Jawaban tersimpan saat kamu menyimpannya."
      />
      <section className="editorial-hero">
        <div>
          <span className="editorial-kicker">
            <BookOpenCheck size={16} aria-hidden="true" /> BELAJAR DENGAN
            TERARAH
          </span>
          <h2>Satu soal, satu langkah maju.</h2>
          <p>
            Buka penugasan kelas, dengarkan soal jika diperlukan, dan lanjutkan
            dari jawaban yang sudah tersimpan.
          </p>
        </div>
      </section>
      {rows.length ? (
        <div className="editorial-card-grid">
          {rows.map((a) => {
            const availability = assignmentAvailability(a);
            return (
              <Link
                key={a.id}
                href={`/siswa/tugas/${a.id}`}
                className="panel editorial-card"
              >
                <div className="editorial-card-top">
                  <span className="class-symbol">
                    <BookOpenCheck size={22} aria-hidden="true" />
                  </span>
                  <Badge
                    active={
                      availability === "open" || availability === "submitted"
                    }
                  >
                    {availabilityLabel[availability]}
                  </Badge>
                </div>
                <h2>{a.title}</h2>
                <p>
                  {a.class_name} · {a.total_questions} soal
                </p>
                <div className="editorial-card-schedule">
                  <CalendarClock size={15} aria-hidden="true" />
                  <span>
                    {a.due_at
                      ? "Tenggat: " + scheduleLabel(a.due_at)
                      : "Tanpa batas pengumpulan"}
                  </span>
                </div>
                <div className="editorial-card-bottom">
                  <span>
                    {a.score !== null
                      ? `Nilai ${a.score}/100`
                      : "Revisi " + a.version}
                  </span>
                  <span>
                    {availability === "submitted"
                      ? "Lihat hasil"
                      : a.attempt_state === "in_progress"
                        ? "Lanjutkan"
                        : "Buka tugas"}
                    <ArrowUpRight size={17} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <section className="panel">
          <Empty title="Tugasmu akan muncul di sini.">
            Guru akan membagikan kuis setelah kamu terdaftar di kelas.
          </Empty>
        </section>
      )}
      <Pagination page={page} next={rows.length === 25} path="/siswa/tugas" />
    </>
  );
}

export async function StudentAssignmentPage({ id }: { id: string }) {
  const assignment = await editorialData<Assignment>(
    `/student/assignments/${id}`,
    "student",
  );
  const [attempt, result] = await Promise.all([
    assignment.attempt_state === "in_progress"
      ? editorialData<AssignmentAttempt>(
          `/student/assignments/${id}/attempt`,
          "student",
        )
      : Promise.resolve(null),
    assignment.attempt_state === "submitted"
      ? editorialData<AssignmentResult>(
          `/student/assignments/${id}/result`,
          "student",
        )
      : Promise.resolve(null),
  ]);
  return (
    <>
      <Link className="learning-back" href="/siswa/tugas">
        <ArrowLeft size={16} aria-hidden="true" /> Semua tugas
      </Link>
      <Heading
        title={assignment.title}
        description={`${assignment.class_name} · ${assignment.total_questions} soal · Revisi ${assignment.version}`}
      />
      <StudentAssignment
        key={JSON.stringify([
          id,
          attempt?.revision ?? "new",
          result?.submitted_at ?? "",
          result?.feedback_released ?? false,
          assignment.is_closed,
          assignment.opens_at,
          assignment.due_at,
        ])}
        assignment={assignment}
        initialAttempt={attempt}
        initialResult={result}
      />
    </>
  );
}

export async function TeacherAssignmentPage({ id }: { id: string }) {
  const result = await editorialData<TeacherResults>(
    `/teacher/assignments/${id}/results`,
    "teacher",
  );
  return (
    <>
      <Link className="learning-back" href="/guru/kuis">
        <ArrowLeft size={16} aria-hidden="true" /> Semua kuis
      </Link>
      <Heading
        title={result.assignment.title}
        description={`${result.assignment.class_name} · Hasil penugasan revisi ${result.assignment.version}`}
      />
      <AssignmentResults initial={result} />
    </>
  );
}
