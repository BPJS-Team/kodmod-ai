"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { backend, BackendError } from "@/lib/server-api";
import { requireSession } from "@/lib/session";
import type { ActionState } from "@/lib/types";
import type { Classroom, Material } from "@/lib/class-types";

const value = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();
const uuid = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
function failure(error: unknown): ActionState {
  return {
    error:
      error instanceof BackendError
        ? error.status === 409
          ? "Perubahan belum bisa disimpan. Anggota mungkin sudah terdaftar atau kelas sudah diarsipkan. Muat ulang kelas untuk memeriksa."
          : error.status === 404
            ? "Kelas, materi, atau username siswa tidak ditemukan. Periksa kembali akses dan isian Anda."
            : error.message
        : "Perubahan belum tersimpan. Silakan coba lagi.",
  };
}
function refresh() {
  revalidatePath("/guru", "layout");
  revalidatePath("/siswa", "layout");
}

export async function createClass(
  _: ActionState,
  data: FormData,
): Promise<ActionState> {
  const { token } = await requireSession("teacher");
  let row: Classroom;
  try {
    row = await backend<Classroom>("/classes", token, {
      method: "POST",
      body: JSON.stringify({
        name: value(data, "name"),
        subject: value(data, "subject"),
        subject_id: value(data, "subject_id") || null,
        description: value(data, "description"),
      }),
    });
  } catch (error) {
    return failure(error);
  }
  refresh();
  redirect(`/guru/kelas/${row.id}?success=class-created`);
}

export async function changeClass(
  classId: string,
  _: ActionState,
  data: FormData,
): Promise<ActionState> {
  const { token } = await requireSession("teacher");
  if (!uuid(classId)) return { error: "Kelas tidak valid." };
  const mode = value(data, "mode");
  try {
    if (mode === "archive" || mode === "restore") {
      await backend(`/classes/${classId}`, token, {
        method: "PATCH",
        body: JSON.stringify({ is_archived: mode === "archive" }),
      });
    } else if (mode === "add-member") {
      await backend(`/classes/${classId}/members`, token, {
        method: "POST",
        body: JSON.stringify({ username: value(data, "username") }),
      });
    } else if (mode === "remove-member" && uuid(value(data, "studentId"))) {
      await backend(
        `/classes/${classId}/members/${value(data, "studentId")}`,
        token,
        { method: "DELETE" },
      );
    } else return { error: "Tindakan tidak valid." };
  } catch (error) {
    return failure(error);
  }
  refresh();
  return {
    success:
      mode === "add-member"
        ? "Siswa berhasil ditambahkan."
        : mode === "remove-member"
          ? "Akses siswa ke kelas telah dicabut."
          : mode === "archive"
            ? "Kelas diarsipkan. Siswa tidak lagi dapat mengaksesnya."
            : "Kelas aktif kembali.",
  };
}

export async function saveMaterial(
  classId: string,
  materialId: string | null,
  _: ActionState,
  data: FormData,
): Promise<ActionState> {
  const { token } = await requireSession("teacher");
  if (!uuid(classId) || (materialId && !uuid(materialId)))
    return { error: "Materi tidak valid." };
  let row: Material;
  try {
    row = await backend<Material>(
      `/classes/${classId}/materials${materialId ? `/${materialId}` : ""}`,
      token,
      {
        method: materialId ? "PUT" : "POST",
        body: JSON.stringify({
          title: value(data, "title"),
          content: value(data, "content"),
          published: value(data, "published") === "yes",
          source_filename: value(data, "source_filename") || null,
        }),
      },
    );
  } catch (error) {
    return failure(error);
  }
  refresh();
  if (!materialId)
    redirect(`/guru/kelas/${classId}/materi/${row.id}?success=material-saved`);
  return { success: "Materi disimpan sesuai status publikasinya." };
}
