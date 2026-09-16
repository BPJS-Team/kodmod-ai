"use client";
import { useState } from "react";
import Link from "next/link";
import { register } from "@/app/actions";
import { Password } from "./forms";
import { ActionFeedback, useConfirmedAction } from "./action-feedback";
export function RegisterForm() {
  const [state, action, pending] = useConfirmedAction(register, {
    title: "Buat akun KODMOD?",
    text: "Pastikan data dan peran sudah benar. Kode undangan akan digunakan untuk mendaftarkan akun ini.",
    confirmText: "Ya, buat akun",
  });
  const [fields, setFields] = useState({
    full_name: "",
    username: "",
    role: "student",
    invitation_code: "",
  });
  function update(key: keyof typeof fields, value: string) {
    setFields((previous) => ({ ...previous, [key]: value }));
  }
  return (
    <form
      className="form-stack"
      onReset={(event) => event.preventDefault()}
      action={action}
    >
      <div className="form-grid">
        {[
          { key: "full_name" as const, label: "Nama lengkap", max: 200 },
          { key: "username" as const, label: "Username", max: 64 },
          { key: "invitation_code" as const, label: "Kode undangan", max: 32 },
        ].map(({ key, label, max }) => (
          <div className="field" key={key}>
            <label htmlFor={key}>{label}</label>
            <input
              id={key}
              name={key}
              value={fields[key]}
              onChange={(e) => update(key, e.target.value)}
              maxLength={max}
              required
              autoComplete={
                key === "username"
                  ? "username"
                  : key === "full_name"
                    ? "name"
                    : "off"
              }
            />
          </div>
        ))}
        <div className="field">
          <label htmlFor="role">Daftar sebagai</label>
          <select
            id="role"
            name="role"
            value={fields.role}
            onChange={(e) => update("role", e.target.value)}
          >
            <option value="student">Siswa</option>
            <option value="teacher">Guru</option>
          </select>
        </div>
      </div>
      <Password label="Kata sandi" autoComplete="new-password" minLength={8} />
      <p className="form-help">
        Minimal 8 karakter. Gunakan kata sandi yang belum dipakai di layanan
        lain.
      </p>
      <ActionFeedback state={state} />
      <button type="submit" className="button primary" disabled={pending}>
        {pending ? "Membuat akun…" : "Buat akun dan mulai"}
      </button>
      <p className="form-help">
        Sudah punya akun?{" "}
        <Link className="text-link" href="/masuk">
          Masuk di sini
        </Link>
      </p>
    </form>
  );
}
