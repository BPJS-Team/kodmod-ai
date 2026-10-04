"use client";
import { useState } from "react";
import Link from "next/link";
import { register } from "@/app/actions";
import { Password } from "./forms";
import { ActionFeedback, useConfirmedAction } from "./action-feedback";
import { useI18n } from "./language-provider";
export function RegisterForm() {
  const { t } = useI18n();
  const [state, action, pending] = useConfirmedAction(register, {
    title: "Buat akun KODMOD?",
    text: "Pastikan nama dan peran sudah benar sebelum membuat akun.",
    confirmText: "Ya, buat akun",
  });
  const [fields, setFields] = useState({
    full_name: "",
    username: "",
    role: "student",
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
        ].map(({ key, label, max }) => (
          <div className="field" key={key}>
            <label htmlFor={key}>{t(label)}</label>
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
          <label htmlFor="role">{t("Daftar sebagai")}</label>
          <select
            id="role"
            name="role"
            value={fields.role}
            onChange={(e) => update("role", e.target.value)}
          >
            <option value="student">{t("Siswa")}</option>
            <option value="teacher">{t("Guru")}</option>
          </select>
        </div>
      </div>
      <Password label="Kata sandi" autoComplete="new-password" minLength={8} />
      <p className="form-help">
        {t("Minimal 8 karakter.")}
      </p>
      <ActionFeedback state={state} />
      <button type="submit" className="button primary" disabled={pending}>
        {t(pending ? "Membuat akun…" : "Buat akun")}
      </button>
      <p className="form-help">
        {t("Sudah punya akun?")}{" "}
        <Link className="text-link" href="/masuk">
          {t("Masuk")}
        </Link>
      </p>
    </form>
  );
}
