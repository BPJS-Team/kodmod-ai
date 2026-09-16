import "server-only";
import { notFound } from "next/navigation";
import { backend, BackendError } from "./server-api";
import { requireSession } from "./session";
import type { LearningRole } from "./class-types";

export async function classroomData<T>(
  role: LearningRole,
  path = "",
): Promise<T> {
  const { token } = await requireSession(role);
  try {
    return await backend<T>(`/classes${path}`, token);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) notFound();
    throw error;
  }
}
