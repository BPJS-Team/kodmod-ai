
import { UiText, UiDate } from "@/components/language-provider";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Layers3,
  Plus,
  Users,
} from "lucide-react";
import { classroomData } from "@/lib/classrooms";
import { requireSession } from "@/lib/session";
import { dateLabel } from "@/lib/types";
import type {
  Classroom,
  ClassDetail,
  LearningRole,
  Material,
  StudentMaterial,
} from "@/lib/class-types";
import { Badge, Empty, Heading } from "./ui";
import { ClassAction, MaterialForm } from "./class-forms";
import { StudentReader } from "./student-reader";
import { StudentOverview } from "./student-overview";
import { readingSettings } from "@/lib/reading-settings";
import { readingDefaults } from "@/lib/reading-preferences";

const baseFor = (role: LearningRole) =>
  role === "teacher" ? "/guru" : "/siswa";
export function BackToClasses({ role }: { role: LearningRole }) {
  return (
    <Link className="learning-back" href={`${baseFor(role)}/kelas`}>
      <ArrowLeft size={16} aria-hidden="true" /><UiText>{"Semua kelas"}</UiText></Link>
  );
}
function ClassCards({ rows, role }: { rows: Classroom[]; role: LearningRole }) {
  return rows.length ? (
    <div className="class-grid">
      {rows.map((row) => (
        <Link
          href={`${baseFor(role)}/kelas/${row.id}`}
          className="class-card panel"
          key={row.id}
        >
          <div className="class-card-top">
            <span className="class-symbol">
              <BookOpen size={23} aria-hidden="true" />
            </span>
            <Badge active={!row.is_archived}>
              {row.is_archived ? <UiText>{"Arsip"}</UiText> : row.subject}
            </Badge>
          </div>
          <h3>{row.name}</h3>
          <p>
            {row.description ||
              `Ruang belajar ${row.subject} bersama ${row.teacher_name}.`}
          </p>
          <div className="class-card-bottom">
            <span>
              {row.material_count}<UiText>{" materi · "}</UiText>{row.member_count}<UiText>{" siswa"}</UiText></span>
            <ArrowUpRight size={20} aria-hidden="true" />
          </div>
        </Link>
      ))}
    </div>
  ) : (
    <div className="panel">
      <Empty
        title={
          role === "teacher"
            ? <UiText>{"Ruang untuk ide pertama Anda."}</UiText>
            : <UiText>{"Kelas Anda akan hadir di sini."}</UiText>
        }
      >
        {role === "teacher"
          ? <UiText>{"Buat kelas, tambahkan siswa, lalu bagikan materi pertama."}</UiText>
          : <UiText>{"Minta guru menambahkan username Anda sebagai anggota kelas untuk mulai belajar."}</UiText>}
      </Empty>
    </div>
  );
}
export async function ClassIndex({
  role,
  dashboard = false,
}: {
  role: LearningRole;
  dashboard?: boolean;
}) {
  const teacher = role === "teacher";
  const [{ user }, rows, studentMaterials] = await Promise.all([
    requireSession(role),
    classroomData<Classroom[]>(role),
    !teacher && dashboard
      ? classroomData<StudentMaterial[]>("student", "/student/materials")
      : Promise.resolve([]),
  ]);
  const active = rows.filter((row) => !row.is_archived);
  const completedMaterialsCount = studentMaterials.filter(
    (m) => m.progress?.completed,
  ).length;
  return (
    <>
      <Heading
        title={dashboard ? <><UiText>{"Halo, "}</UiText> {user.full_name}.</> : <UiText>{"Kelas"}</UiText>}
        description={
          dashboard
            ? teacher
              ? <UiText>{"Kelola kelas, materi, dan tugas siswa."}</UiText>
              : <UiText>{"Buka materi, tanyakan pada Tutor, dan lanjutkan belajarmu."}</UiText>
            : <UiText>{"Materi, anggota, dan ruang belajar Anda dalam satu tempat."}</UiText>
        }
      >
        {teacher && (
          <Link className="button primary" href="/guru/kelas/baru">
            <Plus size={17} aria-hidden="true" /><UiText>{"Buat kelas"}</UiText></Link>
        )}
      </Heading>
      {dashboard && (
        <>
          <section className="learning-hero">
            <div>
              <h2>
                {teacher
                  ? <UiText>{"Siapkan kelas dan materi belajar."}</UiText>
                  : <UiText>{"Lanjutkan belajar dari kelasmu."}</UiText>}
              </h2>
              <p>
                {teacher
                  ? <UiText>{"Siapkan materi, ajak siswa, dan bangun pengalaman belajar yang lebih terarah."}</UiText>
                  : <UiText>{"Buka kelas Anda, pilih materi, dan belajar sesuai ritme yang nyaman."}</UiText>}
              </p>
              <Link
                href={`${baseFor(role)}/kelas`}
                className="button learning-hero-button"
              ><UiText>{"Jelajahi kelas"}</UiText><ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            </div>
            <div className="learning-orbit" aria-hidden="true">
              <BookOpen size={68} strokeWidth={1} />
            </div>
          </section>
          <div className="learning-stats">
            {[
              { title: "Kelas aktif", value: active.length, icon: Layers3 },
              {
                title: teacher ? "Materi di kelas aktif" : "Materi tersedia",
                value: active.reduce((sum, row) => sum + row.material_count, 0),
                icon: BookOpen,
              },
              {
                title: teacher ? "Keanggotaan siswa" : "Materi selesai",
                value: teacher
                  ? active.reduce((sum, row) => sum + row.member_count, 0)
                  : completedMaterialsCount,
                icon: teacher ? Users : CheckCircle2,
              },
            ].map(({ title, value, icon: Icon }) => (
              <div className="panel learning-stat" key={title}>
                <Icon size={21} aria-hidden="true" />
                <span>
                  <UiText>{title}</UiText>
                  <strong>{value}</strong>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
      {dashboard && !teacher && <StudentOverview />}
      <div className="learning-section-heading">
        <h2>{dashboard ? <UiText>{"Ruang belajar terbaru"}</UiText> : <UiText>{"Semua ruang belajar"}</UiText>}</h2>
        <span>{rows.length}<UiText>{" kelas"}</UiText></span>
      </div>
      <ClassCards rows={dashboard ? rows.slice(0, 6) : rows} role={role} />
      {dashboard && rows.length > 6 && (
        <Link className="learning-back" href={`${baseFor(role)}/kelas`}><UiText>{"Lihat semua kelas"}</UiText><ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      )}
    </>
  );
}
export async function ClassRoom({
  role,
  id,
}: {
  role: LearningRole;
  id: string;
}) {
  const row = await classroomData<ClassDetail>(
    role,
    `/${encodeURIComponent(id)}`,
  );
  const teacher = role === "teacher";
  return (
    <>
      <BackToClasses role={role} />
      <Heading
        title={row.name}
        description={row.description || `Ruang belajar ${row.subject}.`}
      >
        {teacher && (
          <ClassAction
            classId={id}
            mode={row.is_archived ? "restore" : "archive"}
          />
        )}
      </Heading>
      <div className="class-meta">
        <Badge active={!row.is_archived}>
          {row.is_archived ? <UiText>{"Diarsipkan"}</UiText> : row.subject}
        </Badge>
        <span><UiText>{"Guru: "}</UiText>{row.teacher_name}</span>
        <span>{row.member_count}<UiText>{" siswa"}</UiText></span>
      </div>
      {row.is_archived && (
        <p className="info-note"><UiText>{"Kelas ini diarsipkan. Aktifkan kembali untuk mengelola anggota dan materi."}</UiText></p>
      )}
      <div className={`class-detail-grid ${teacher ? "" : "student-detail"}`}>
        <section className="panel learning-section">
          <div className="learning-section-heading">
            <h2><UiText>{"Materi belajar"}</UiText></h2>
            {teacher && !row.is_archived && (
              <Link
                className="button primary"
                href={`/guru/kelas/${id}/materi/baru`}
              >
                <Plus size={16} aria-hidden="true" /><UiText>{"Upload materi"}</UiText></Link>
            )}
          </div>
          {row.materials.length ? (
            <div className="material-list">
              {row.materials.map((material, index) => (
                <Link
                  key={material.id}
                  className="material-row"
                  href={`${baseFor(role)}/kelas/${id}/materi/${material.id}`}
                >
                  <span className="material-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="material-info">
                    <strong>{material.title}</strong>
                    <small>
                      {<UiDate value={material.created_at} />}
                      {teacher
                        ? ` · ${material.published ? "Terbit" : "Draft"}`
                        : <UiText>{" · Siap dibaca"}</UiText>}
                    </small>
                  </span>
                  <ArrowUpRight size={20} aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : (
            <Empty title={<UiText>{"Belum ada materi"}</UiText>}>
              {teacher
                ? <UiText>{"Mulai dengan satu penjelasan sederhana. Simpan draft atau langsung terbitkan untuk siswa."}</UiText>
                : <UiText>{"Guru belum menerbitkan materi. Silakan kembali setelah materi dibagikan."}</UiText>}
            </Empty>
          )}
        </section>
        {teacher && (
          <section className="panel learning-section">
            <h2><UiText>{"Anggota kelas"}</UiText>{" "}
              <span className="muted">({row.members.length})</span>
            </h2>
            {!row.is_archived && <ClassAction classId={id} mode="add-member" />}
            <div className="member-list">
              {row.members.map((member) => (
                <div className="member-row" key={member.id}>
                  <div>
                    <strong>{member.full_name}</strong>
                    <small>
                      @{member.username}
                      {!member.is_active ? <UiText>{" · Nonaktif"}</UiText> : ""}
                    </small>
                  </div>
                  {!row.is_archived && (
                    <ClassAction
                      classId={id}
                      mode="remove-member"
                      studentId={member.id}
                      name={member.full_name}
                    />
                  )}
                </div>
              ))}
            </div>
            {!row.members.length && (
              <p className="muted"><UiText>{"Belum ada anggota. Tambahkan siswa menggunakan username akunnya."}</UiText></p>
            )}
          </section>
        )}
      </div>
    </>
  );
}
export async function MaterialPage({
  role,
  id,
  materialId,
}: {
  role: LearningRole;
  id: string;
  materialId: string;
}) {
  const [row, material, preferences] = await Promise.all([
    classroomData<ClassDetail>(role, `/${encodeURIComponent(id)}`),
    classroomData<Material>(
      role,
      `/${encodeURIComponent(id)}/materials/${encodeURIComponent(materialId)}`,
    ),
    role === "student" ? readingSettings() : Promise.resolve(readingDefaults),
  ]);
  return (
    <>
      <Link className="learning-back" href={`${baseFor(role)}/kelas/${id}`}>
        <ArrowLeft size={16} aria-hidden="true" />
        {row.name}
      </Link>
      <Heading
        title={material.title}
        description={`${row.subject} · ${row.teacher_name} · ${dateLabel(material.created_at)}`}
      />
      {role === "teacher" && !row.is_archived ? (
        <MaterialForm classId={id} material={material} />
      ) : role === "student" ? (
        <StudentReader
          key={material.id}
          classId={id}
          material={material}
          preferences={preferences}
        />
      ) : (
        <article className="panel material-reader" aria-label="Isi materi">
          {material.content}
        </article>
      )}
    </>
  );
}
