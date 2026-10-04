"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { backend, BackendError } from "@/lib/server-api";
import { requireSession, SESSION_COOKIE } from "@/lib/session";
import { sessionCookieSecure } from "@/lib/cookie-security";
import { homeFor, type ActionState, type User } from "@/lib/types";

const text = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();
function problem(error: unknown): ActionState {
  if (!(error instanceof BackendError)) throw error;
  return { error: error.message };
}
export async function login(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const username = text(data, "username").toLowerCase();
  const password = String(data.get("password") ?? "");
  if (!username || !password)
    return { error: "Isi username dan kata sandi terlebih dahulu." };
  let result: { access_token: string; expires_in: number; user: User };
  try {
    result = await backend("/auth/login", undefined, {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  } catch (error) {
    return error instanceof BackendError && error.status === 401
      ? { error: "Username atau kata sandi tidak sesuai." }
      : problem(error);
  }
  if (
    !result.access_token ||
    !Number.isFinite(result.expires_in) ||
    !result.user.is_active ||
    !["admin", "teacher", "student"].includes(result.user.role)
  )
    return { error: "Sesi tidak valid. Hubungi administrator." };
  (await cookies()).set(SESSION_COOKIE, result.access_token, {
    httpOnly: true,
    secure: sessionCookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(0, result.expires_in),
  });
  redirect(`${homeFor(result.user.role)}?success=signed-in`);
}
export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/masuk?success=signed-out");
}
export async function register(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const username = text(data, "username").toLowerCase(),
    full_name = text(data, "full_name"),
    role = text(data, "role"),
    password = String(data.get("password") ?? "");
  if (
    !full_name ||
    full_name.length > 200 ||
    !/^[a-zA-Z0-9._-]{3,64}$/.test(username) ||
    !["student", "teacher"].includes(role) ||
    password.length < 8 ||
    new TextEncoder().encode(password).length > 72
  )
    return {
      error:
        "Periksa nama, username, peran, dan kata sandi (minimal 8 karakter).",
    };
  let result: { access_token: string; expires_in: number; user: User };
  try {
    result = await backend("/auth/register", undefined, {
      method: "POST",
      body: JSON.stringify({
        username,
        full_name,
        password,
        role,
      }),
    });
  } catch (error) {
    return error instanceof BackendError && error.status === 409
      ? {
          error:
            "Username sudah digunakan. Pilih username lain.",
        }
      : problem(error);
  }
  if (
    !result.access_token ||
    !Number.isFinite(result.expires_in) ||
    !result.user.is_active ||
    !["student", "teacher"].includes(result.user.role)
  )
    return { error: "Sesi tidak valid. Hubungi administrator." };
  (await cookies()).set(SESSION_COOKIE, result.access_token, {
    httpOnly: true,
    secure: sessionCookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(0, result.expires_in),
  });
  redirect(`${homeFor(result.user.role)}?success=registered`);
}
export async function saveUser(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const { token, user: admin } = await requireSession("admin");
  const id = text(data, "id"),
    full_name = text(data, "full_name"),
    role = text(data, "role");
  if (
    !full_name ||
    full_name.length > 200 ||
    !["admin", "teacher", "student"].includes(role)
  )
    return { error: "Isi nama lengkap dan pilih peran pengguna." };
  if (id === admin.id && role !== "admin")
    return { error: "Peran akun Anda sendiri tidak dapat diubah." };
  const body: Record<string, unknown> = { full_name, role };
  if (!id) {
    const username = text(data, "username").toLowerCase(),
      password = String(data.get("password") ?? "");
    if (!/^[a-zA-Z0-9._-]{3,64}$/.test(username))
      return {
        error:
          "Username harus 3–64 karakter: huruf, angka, titik, garis bawah, atau tanda hubung.",
      };
    if (password.length < 8 || new TextEncoder().encode(password).length > 72)
      return { error: "Kata sandi minimal 8 karakter dan maksimal 72 byte." };
    Object.assign(body, { username, password });
  }
  try {
    await backend(
      `/admin/users${id ? `/${encodeURIComponent(id)}` : ""}`,
      token,
      { method: id ? "PATCH" : "POST", body: JSON.stringify(body) },
    );
  } catch (error) {
    return problem(error);
  }
  revalidatePath("/admin", "layout");
  redirect("/admin/pengguna?success=saved");
}
export async function toggleUser(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const { token, user } = await requireSession("admin");
  const id = text(data, "id");
  if (!id || id === user.id)
    return { error: "Akses akun Anda sendiri tidak dapat dinonaktifkan." };
  try {
    await backend(`/admin/users/${encodeURIComponent(id)}`, token, {
      method: "PATCH",
      body: JSON.stringify({ is_active: text(data, "active") === "true" }),
    });
  } catch (error) {
    return problem(error);
  }
  revalidatePath("/admin", "layout");
  return { success: "Status akun berhasil diperbarui." };
}
