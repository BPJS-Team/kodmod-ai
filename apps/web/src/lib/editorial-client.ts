"use client";
export class EditorialError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function editorialRequest<T>(
  path: string,
  method = "GET",
  body?: unknown,
  key?: string,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/editorial${path}`, {
      method,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(key ? { "Idempotency-Key": key } : {}),
      },
      body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
    });
  } catch {
    throw new EditorialError(
      0,
      "Koneksi terputus. Muat ulang progres atau coba kirim kembali.",
    );
  }
  const result = await response.json().catch(() => null);
  if (!response.ok)
    throw new EditorialError(
      response.status,
      typeof result?.message === "string"
        ? result.message
        : "Permintaan belum dapat diproses.",
    );
  if (result === null)
    throw new EditorialError(
      0,
      "Respons belum dapat dibaca. Hasil pengiriman belum pasti; coba lagi.",
    );
  return result as T;
}
