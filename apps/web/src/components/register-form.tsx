"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { register } from "@/app/actions";
export function RegisterForm() {
  const [state, action, pending] = useActionState(register, {});
  const [fields, setFields] = useState({
    full_name: "",
    username: "",
    role: "student",
    invitation_code: "",
    password: "",
  });
  function update(key: keyof typeof fields, value: string) {
    setFields((previous) => ({ ...previous, [key]: value }));
  }
  return (
    <form className="form-stack" onReset={(event) => event.preventDefault()} action={action}>
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
      <div className="field">
        <label htmlFor="password">Kata sandi</label>
        <input
          id="password"
          name="password"
          type="password"
          minLength={8}
          maxLength={72}
          required
          autoComplete="new-password"
          value={fields.password}
          onChange={(e) => update("password", e.target.value)}
        />
        <small>
          Minimal 8 karakter. Gunakan kata sandi yang belum dipakai di layanan
          lain.
        </small>
      </div>
      <div role="alert">
        {state.error && <p className="alert error-message">{state.error}</p>}
      </div>
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
