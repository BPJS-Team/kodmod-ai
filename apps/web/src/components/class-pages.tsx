import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Layers3,
  Plus,
  Users,
  Sparkles,
} from "lucide-react";
import { classroomData } from "@/lib/classrooms";
import { requireSession } from "@/lib/session";
import { dateLabel } from "@/lib/types";
import type {
  Classroom,
  ClassDetail,
  LearningRole,
  Material,
} from "@/lib/class-types";
import { Badge, Empty, Heading } from "./ui";
import { ClassAction, MaterialForm } from "./class-forms";

const baseFor = (role: LearningRole) =>
  role === "teacher" ? "/guru" : "/siswa";
export function BackToClasses({ role }: { role: LearningRole }) {
  return (
    <Link className="learning-back" href={`${baseFor(role)}/kelas`}>
      <ArrowLeft size={16} aria-hidden="true" /> Semua kelas
    </Link>
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
              {row.is_archived ? "Arsip" : row.subject}
            </Badge>
          </div>
          <h3>{row.name}</h3>
          <p>
            {row.description ||
              `Ruang belajar ${row.subject} bersama ${row.teacher_name}.`}
          </p>
          <div className="class-card-bottom">
            <span>
              {row.material_count} materi · {row.member_count} siswa
            </span>
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
            ? "Ruang untuk ide pertama Anda."
            : "Kelas Anda akan hadir di sini."
        }
      >
        {role === "teacher"
          ? "Buat kelas, tambahkan siswa, lalu bagikan materi pertama."
          : "Minta guru menambahkan username Anda sebagai anggota kelas untuk mulai belajar."}
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
  const [{ user }, rows] = await Promise.all([
    requireSession(role),
    classroomData<Classroom[]>(role),
  ]);
  const active = rows.filter((row) => !row.is_archived);
  const teacher = role === "teacher";
  return (
    <>
      <Heading
        title={dashboard ? `Halo, ${user.full_name}.` : "Kelas saya"}
        description={
          dashboard
            ? teacher
              ? "Satu ruang untuk menumbuhkan banyak kemungkinan."
              : "Sedikit demi sedikit, pengetahuan baru dimulai di sini."
            : "Materi, anggota, dan ruang belajar Anda dalam satu tempat."
        }
      >
        {teacher && (
          <Link className="button primary" href="/guru/kelas/baru">
            <Plus size={17} aria-hidden="true" />
            Buat kelas
          </Link>
        )}
      </Heading>
      {dashboard && (
        <>
          <section className="learning-hero">
            <div>
              <span className="learning-eyebrow">
                <Sparkles size={15} aria-hidden="true" />{" "}
                {teacher
                  ? "DARI IDE MENJADI PEMAHAMAN"
                  : "RUANG UNTUK BERTUMBUH"}
              </span>
              <h2>
                {teacher
                  ? "Pelajaran hebat dimulai dari ruang yang tepat."
                  : "Langkah kecil hari ini. Wawasan baru esok hari."}
              </h2>
              <p>
                {teacher
                  ? "Siapkan materi, ajak siswa, dan bangun pengalaman belajar yang lebih terarah."
                  : "Buka kelas Anda, pilih materi, dan belajar sesuai ritme yang nyaman."}
              </p>
              <Link
                href={`${baseFor(role)}/kelas`}
                className="button learning-hero-button"
              >
                Jelajahi kelas <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            </div>
            <div className="learning-orbit" aria-hidden="true">
              <BookOpen size={68} strokeWidth={1} />
              <span>LEARN · GROW · REPEAT</span>
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
                title: teacher ? "Keanggotaan siswa" : "Username Anda",
                value: teacher
                  ? active.reduce((sum, row) => sum + row.member_count, 0)
                  : `@${user.username}`,
                icon: Users,
              },
            ].map(({ title, value, icon: Icon }) => (
              <div className="panel learning-stat" key={title}>
                <Icon size={21} aria-hidden="true" />
                <span>
                  {title}
                  <strong>{value}</strong>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="learning-section-heading">
        <h2>{dashboard ? "Ruang belajar terbaru" : "Semua ruang belajar"}</h2>
        <span>{rows.length} kelas</span>
      </div>
      <ClassCards rows={dashboard ? rows.slice(0, 6) : rows} role={role} />
      {dashboard && rows.length > 6 && (
        <Link className="learning-back" href={`${baseFor(role)}/kelas`}>
          Lihat semua kelas <ArrowUpRight size={16} aria-hidden="true" />
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
          {row.is_archived ? "Diarsipkan" : row.subject}
        </Badge>
        <span>Guru: {row.teacher_name}</span>
        <span>{row.member_count} siswa</span>
      </div>
      {row.is_archived && (
        <p className="info-note">
          Kelas ini diarsipkan. Aktifkan kembali untuk mengelola anggota dan
          materi.
        </p>
      )}
      <div className={`class-detail-grid ${teacher ? "" : "student-detail"}`}>
        <section className="panel learning-section">
          <div className="learning-section-heading">
            <h2>Materi belajar</h2>
            {teacher && !row.is_archived && (
              <Link
                className="button primary"
                href={`/guru/kelas/${id}/materi/baru`}
              >
                <Plus size={16} aria-hidden="true" />
                Tambah materi
              </Link>
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
                      {dateLabel(material.created_at)}
                      {teacher
                        ? ` · ${material.published ? "Terbit" : "Draft"}`
                        : " · Siap dibaca"}
                    </small>
                  </span>
                  <ArrowUpRight size={20} aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : (
            <Empty title="Belum ada materi">
              {teacher
                ? "Mulai dengan satu penjelasan sederhana. Simpan draft atau langsung terbitkan untuk siswa."
                : "Guru belum menerbitkan materi. Silakan kembali setelah materi dibagikan."}
            </Empty>
          )}
        </section>
        {teacher && (
          <section className="panel learning-section">
            <h2>
              Anggota kelas{" "}
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
                      {!member.is_active ? " · Nonaktif" : ""}
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
              <p className="muted">
                Belum ada anggota. Tambahkan siswa menggunakan username akunnya.
              </p>
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
  const [row, material] = await Promise.all([
    classroomData<ClassDetail>(role, `/${encodeURIComponent(id)}`),
    classroomData<Material>(
      role,
      `/${encodeURIComponent(id)}/materials/${encodeURIComponent(materialId)}`,
    ),
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
      ) : (
        <article className="panel material-reader" aria-label="Isi materi">
          {material.content}
        </article>
      )}
    </>
  );
}
