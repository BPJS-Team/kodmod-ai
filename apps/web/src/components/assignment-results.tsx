"use client";
import { useRef, useState } from "react";
import { RefreshCw, LockKeyhole } from "lucide-react";
import { editorialRequest } from "@/lib/editorial-client";
import { scheduleLabel, type TeacherResults } from "@/lib/editorial-types";
import { confirmAction, notifyResult } from "@/lib/dialogs";
import { Badge, Empty } from "./ui";
import "@/styles/editorial.css";

export function AssignmentResults({ initial }: { initial: TeacherResults }) {
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const locked = useRef(false);
  async function refresh(close = false) {
    if (locked.current) return;
    locked.current = true;
    try {
      if (
        close &&
        !(await confirmAction({
          title: "Tutup penugasan?",
          text: "Siswa tidak dapat memulai atau mengirim jawaban baru. Nilai yang sudah diterima tetap tersimpan.",
          confirmText: "Ya, tutup",
          destructive: true,
        }))
      )
        return;
      setBusy(true);
      setError("");
      if (close)
        await editorialRequest(
          `/teacher/assignments/${data.assignment.id}/close`,
          "POST",
        );
      setData(
        await editorialRequest<TeacherResults>(
          `/teacher/assignments/${data.assignment.id}/results`,
        ),
      );
      if (close)
        await notifyResult("Penugasan ditutup. Hasil siswa tetap tersimpan.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Hasil belum dapat dimuat.",
      );
    } finally {
      setBusy(false);
      locked.current = false;
    }
  }
  return (
    <>
      <div className="editorial-status-bar">
        <Badge active={!data.assignment.is_closed}>
          {data.assignment.is_closed ? "Penugasan ditutup" : "Penugasan aktif"}
        </Badge>
        <span>
          Dibuka:{" "}
          {data.assignment.opens_at
            ? scheduleLabel(data.assignment.opens_at)
            : "Langsung"}
        </span>
        <span>Tenggat: {scheduleLabel(data.assignment.due_at)}</span>
      </div>
      {error && (
        <p role="alert" className="editorial-error">
          {error}
        </p>
      )}
      <div className="learning-stats editorial-result-stats">
        {[
          { label: "Siswa terdaftar", value: data.enrolled_count },
          {
            label: "Sudah mengirim",
            value: `${data.submitted_count}/${data.enrolled_count}`,
          },
          {
            label: "Rata-rata nilai",
            value:
              data.average_score === null
                ? "Belum tersedia"
                : `${data.average_score}/100`,
          },
        ].map((s) => (
          <div className="panel learning-stat" key={s.label}>
            <span>
              {s.label}
              <strong>{s.value}</strong>
            </span>
          </div>
        ))}
      </div>
      <section className="panel editorial-section">
        <div className="learning-section-heading">
          <h2>Hasil siswa</h2>
          <div className="editorial-toolbar">
            <button
              type="button"
              className="button secondary small"
              disabled={busy}
              onClick={() => void refresh()}
            >
              <RefreshCw size={16} aria-hidden="true" /> Perbarui
            </button>
            <button
              type="button"
              className="button secondary small"
              disabled={busy || data.assignment.is_closed}
              onClick={() => void refresh(true)}
            >
              <LockKeyhole size={16} aria-hidden="true" /> Tutup penugasan
            </button>
          </div>
        </div>
        {data.results.length ? (
          <div className="editorial-table-scroll">
            <table className="editorial-table">
              <caption className="sr-only">
                Hasil anggota aktif kelas {data.assignment.class_name}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Siswa</th>
                  <th scope="col">Status</th>
                  <th scope="col">Nilai</th>
                  <th scope="col">Dikirim pada</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((r) => (
                  <tr key={r.student_id}>
                    <th scope="row">{r.full_name}</th>
                    <td>
                      <Badge active={r.state === "submitted"}>
                        {r.state === "submitted"
                          ? "Selesai"
                          : r.state === "in_progress"
                            ? "Sedang dikerjakan"
                            : "Belum mulai"}
                      </Badge>
                    </td>
                    <td>
                      {r.score === null ? "Belum dinilai" : `${r.score}/100`}
                    </td>
                    <td>
                      {r.submitted_at
                        ? scheduleLabel(r.submitted_at)
                        : "Belum mengirim"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Belum ada anggota aktif">
            Tambahkan siswa ke kelas untuk membagikan penugasan ini.
          </Empty>
        )}
        <p className="editorial-help">
          Nilai pilihan ganda berbobot sama. Ringkasan ini mengikuti anggota
          aktif kelas saat ini.
        </p>
      </section>
    </>
  );
}
