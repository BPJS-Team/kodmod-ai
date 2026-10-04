"use client";
import { UiText, useI18n } from "@/components/language-provider";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  Bookmark,
  BookOpen,
  CheckCircle2,
  Search,
} from "lucide-react";
import type { StudentMaterial } from "@/lib/class-types";
import { Empty } from "./ui";

export function StudentLibrary({
  materials,
}: {
  materials: StudentMaterial[];
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [classId, setClassId] = useState("");
  const [limit, setLimit] = useState(12);
  const classes = [
    ...new Map(materials.map((m) => [m.class_id, m.class_name])).entries(),
  ];
  const filtered = materials.filter(
    (m) =>
      (!classId || m.class_id === classId) &&
      `${m.title} ${m.class_name} ${m.subject}`
        .toLocaleLowerCase("id")
        .includes(query.trim().toLocaleLowerCase("id")) &&
      (status === "all" ||
        (status === "saved" && m.progress.bookmarked) ||
        (status === "done" && m.progress.completed) ||
        (status === "pending" && !m.progress.completed)),
  );
  return (
    <>
      <section className="panel library-filters" aria-label={t("Cari materi")}>
        <label className="field library-search">
          <span>
            <Search size={16} aria-hidden="true" /><UiText>{"Cari materi"}</UiText></span>
          <input
            type="search"
            placeholder={t("Judul, kelas, atau mata pelajaran")}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(12);
            }}
          />
        </label>
        <label className="field"><UiText>{"Kelas"}</UiText><select
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setLimit(12);
            }}
          >
            <option value=""><UiText>{"Semua kelas"}</UiText></option>
            {classes.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="field"><UiText>{"Status bacaan"}</UiText><select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setLimit(12);
            }}
          >
            <option value="all"><UiText>{"Semua materi"}</UiText></option>
            <option value="pending"><UiText>{"Belum selesai"}</UiText></option>
            <option value="done"><UiText>{"Sudah dipelajari"}</UiText></option>
            <option value="saved"><UiText>{"Bookmark"}</UiText></option>
          </select>
        </label>
      </section>
      <p className="library-result" role="status">
        {filtered.length}<UiText>{" materi ditemukan"}</UiText></p>
      {!materials.length ? (
        <div className="panel">
          <Empty title={<UiText>{"Bacaan pertama Anda akan hadir di sini."}</UiText>}><UiText>{"Materi yang diterbitkan guru di kelas Anda akan otomatis muncul. Hubungi guru jika kelas belum tersedia."}</UiText></Empty>
        </div>
      ) : !filtered.length ? (
        <div className="panel">
          <Empty title={<UiText>{"Belum ada materi yang cocok."}</UiText>}><UiText>{"Coba kata kunci lain atau ubah filter kelas dan status bacaan."}</UiText></Empty>
          <button
            className="button secondary library-reset"
            onClick={() => {
              setQuery("");
              setClassId("");
              setStatus("all");
              setLimit(12);
            }}
          ><UiText>{"Reset filter"}</UiText></button>
        </div>
      ) : (
        <div className="student-material-grid">
          {filtered.slice(0, limit).map((m) => (
            <Link
              className="panel student-material-card"
              href={`/siswa/kelas/${m.class_id}/materi/${m.id}`}
              key={m.id}
            >
              <div className="student-material-top">
                <span className="class-symbol">
                  <BookOpen size={22} aria-hidden="true" />
                </span>
                <span>{m.subject}</span>
                {m.progress.bookmarked && (
                  <Bookmark size={18} aria-label={t("Tersimpan di bookmark")} />
                )}
              </div>
              <h2>{m.title}</h2>
              <p>{m.class_name}</p>
              <div className="student-material-bottom">
                <span>
                  {m.progress.completed ? (
                    <>
                      <CheckCircle2 size={16} aria-hidden="true" /><UiText>{"Sudah dipelajari"}</UiText></>
                  ) : (
                    "Belum selesai"
                  )}
                </span>
                <ArrowUpRight size={19} aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>
      )}
      {filtered.length > limit && (
        <button
          className="button secondary library-more"
          onClick={() => setLimit(limit + 12)}
        ><UiText>{"Tampilkan lebih banyak"}</UiText></button>
      )}
    </>
  );
}
