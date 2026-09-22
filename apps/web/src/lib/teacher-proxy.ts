import "server-only";

import { NextResponse } from "next/server";
import { session } from "@/lib/session";
import { backend, BackendError } from "@/lib/server-api";

export async function forwardTeacher<T>(path: string) {
  const current = await session();
  if (!current) {
    return NextResponse.json({ message: "Sesi berakhir. Silakan masuk kembali." }, { status: 401 });
  }
  if (current.user.role !== "teacher") {
    return NextResponse.json({ message: "Ruang analitik hanya tersedia untuk guru." }, { status: 403 });
  }
  try {
    const payload = await backend<T>(path, current.token);
    return NextResponse.json(payload);
  } catch (error) {
    const status = error instanceof BackendError ? error.status : 503;
    const message =
      error instanceof BackendError
        ? error.message
        : "Data siswa belum dapat dimuat. Coba lagi beberapa saat.";
    return NextResponse.json({ message }, { status });
  }
}
