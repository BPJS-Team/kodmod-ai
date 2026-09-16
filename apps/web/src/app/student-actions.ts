"use server";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { backend, BackendError } from "@/lib/server-api";
import type { ActionState } from "@/lib/types";

export async function saveReadingProgress(
  classId: string,
  materialId: string,
  _: ActionState,
  data: FormData,
): Promise<ActionState> {
  const { token } = await requireSession("student");
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const field = data.get("field");
  const value = data.get("value");
  if (
    !uuid.test(classId) ||
    !uuid.test(materialId) ||
    (field !== "completed" && field !== "bookmarked") ||
    (value !== "true" && value !== "false")
  )
    return { error: "Perubahan tidak valid. Muat ulang materi." };
  try {
    await backend(
      `/classes/${classId}/materials/${materialId}/progress`,
      token,
      { method: "PATCH", body: JSON.stringify({ [field]: value === "true" }) },
    );
  } catch (error) {
    return {
      error:
        error instanceof BackendError
          ? error.status === 404
            ? "Materi tidak lagi tersedia untuk akun Anda. Kembali ke pustaka untuk melihat materi yang dapat diakses."
            : error.message
          : "Progres belum tersimpan. Silakan coba lagi.",
    };
  }
  revalidatePath("/siswa", "layout");
  return {
    success:
      field === "completed"
        ? value === "true"
          ? "Materi ditandai sudah dipelajari."
          : "Materi dikembalikan ke daftar belum selesai."
        : value === "true"
          ? "Materi ditambahkan ke bookmark."
          : "Bookmark materi dihapus.",
  };
}
