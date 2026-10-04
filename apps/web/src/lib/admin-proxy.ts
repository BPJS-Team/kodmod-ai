import "server-only";

import { NextResponse } from "next/server";
import { session } from "@/lib/session";
import { backend, BackendError } from "@/lib/server-api";

export async function forwardAdmin<T>(path: string, init: RequestInit = {}) {
  const current = await session();
  if (!current) {
    return NextResponse.json({ message: "Sesi berakhir. Silakan masuk kembali." }, { status: 401 });
  }
  if (current.user.role !== "admin") {
    return NextResponse.json({ message: "Insight operasional hanya tersedia untuk admin." }, { status: 403 });
  }
  try {
    return NextResponse.json(await backend<T>(path, current.token, init));
  } catch (error) {
    const status = error instanceof BackendError ? error.status : 503;
    const message =
      error instanceof BackendError
        ? error.message
        : "Insight operasional belum dapat dimuat. Coba lagi beberapa saat.";
    return NextResponse.json({ message }, { status });
  }
}
