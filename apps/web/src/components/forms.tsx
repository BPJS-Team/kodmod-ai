"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, LoaderCircle, Check } from "lucide-react";
import {
  login,
  saveUser,
  toggleUser,
  createInvitation,
  revokeInvitation,
} from "@/app/actions";
import {
  ActionFeedback as Feedback,
  useConfirmedAction,
} from "./action-feedback";
import { confirmAction, notifyResult } from "@/lib/dialogs";
import { roleLabel, type User } from "@/lib/types";

function Submit({
  pending,
  children,
}: {
  pending: boolean;
  children: React.ReactNode;
}) {
  return (
    <button className="button primary" type="submit" disabled={pending}>
      {pending && (
        <LoaderCircle className="spin" size={18} aria-hidden="true" />
      )}
      {pending ? "Memproses…" : children}
    </button>
  );
}
export function Password({
  label,
  autoComplete,
  minLength,
}: {
  label: string;
  autoComplete: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  const [password, setPassword] = useState("");
  return (
    <div className="field">
      <label htmlFor="password">{label}</label>
      <div className="password-field">
        <input
          id="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type={visible ? "text" : "password"}
          required
          minLength={minLength}
          maxLength={72}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          aria-label={
            visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
          }
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </div>
    </div>
  );
}
export function LoginForm() {
  const [state, action, pending] = useConfirmedAction(login, {
    title: "Masuk ke KODMOD?",
    text: "Lanjutkan masuk menggunakan akun yang telah Anda isi.",
    confirmText: "Ya, masuk",
  });
  const [username, setUsername] = useState("");
  return (
    <form
      onReset={(event) => event.preventDefault()}
      action={action}
      className="form-stack"
    >
      <div className="field">
        <label htmlFor="username">Username</label>
        <input
          id="username"
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Username dari sekolah"
        />
      </div>
      <Password label="Kata sandi" autoComplete="current-password" />
      <Feedback state={state} />
      <Submit pending={pending}>
        Masuk ke ruang belajar <ArrowRight size={18} />
      </Submit>
      <p className="form-help">
        Punya kode undangan?{" "}
        <Link className="text-link" href="/daftar">
          Buat akun
        </Link>
      </p>
      <p className="form-help">
        Lupa kata sandi? Hubungi administrator sekolah untuk bantuan akses.
      </p>
    </form>
  );
}
export function UserForm({
  user,
  self = false,
}: {
  user?: User;
  self?: boolean;
}) {
  const [state, action, pending] = useConfirmedAction(saveUser, {
    title: user ? "Simpan perubahan pengguna?" : "Buat pengguna baru?",
    text: "Pastikan nama dan peran sudah sesuai. Peran menentukan akses pengguna.",
    confirmText: user ? "Ya, simpan" : "Ya, buat pengguna",
  });
  const [name, setName] = useState(user?.full_name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [role, setRole] = useState(user?.role || "student");
  return (
    <form
      onReset={(event) => event.preventDefault()}
      action={action}
      className="panel form-panel"
    >
      <input type="hidden" name="id" value={user?.id || ""} />
      <div className="form-grid">
        <div className="field">
          <label htmlFor="full_name">Nama lengkap</label>
          <input
            id="full_name"
            name="full_name"
            required
            maxLength={200}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div className="field">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            required
            minLength={3}
            maxLength={64}
            pattern="[a-zA-Z0-9._\-]+"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            readOnly={!!user}
            autoCapitalize="none"
            spellCheck={false}
            autoComplete="off"
            aria-describedby="username-help"
          />
          <small id="username-help">
            {user
              ? "Username tidak dapat diubah."
              : "Huruf, angka, titik, garis bawah, atau tanda hubung."}
          </small>
        </div>
        <div className="field">
          <label htmlFor="role">Peran</label>
          <select
            id="role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as User["role"])}
            disabled={self}
          >
            {Object.entries(roleLabel).map(([v, t]) => (
              <option value={v} key={v}>
                {t}
              </option>
            ))}
          </select>
          {self && <input type="hidden" name="role" value="admin" />}
        </div>
        {!user && (
          <Password
            label="Kata sandi awal"
            autoComplete="new-password"
            minLength={8}
          />
        )}
      </div>
      <Feedback state={state} />
      <div className="form-footer">
        <Link className="button secondary" href="/admin/pengguna">
          Batal
        </Link>
        <Submit pending={pending}>
          {user ? "Simpan perubahan" : "Buat pengguna"}
        </Submit>
      </div>
    </form>
  );
}
export function StatusForm({ user, self }: { user: User; self: boolean }) {
  const [state, action, pending] = useConfirmedAction(toggleUser, {
    title: user.is_active ? "Nonaktifkan akun?" : "Aktifkan akun?",
    text: `${user.full_name}: ${user.is_active ? "akses masuk akan dihentikan. Data dan riwayat tetap disimpan." : "pengguna dapat masuk kembali."}`,
    confirmText: user.is_active ? "Ya, nonaktifkan" : "Ya, aktifkan",
    destructive: user.is_active,
  });
  return (
    <section className="panel">
      <h2>Akses akun</h2>
      <p className="muted">
        {self
          ? "Akun Anda sendiri tidak dapat dinonaktifkan."
          : "Penonaktifan menghentikan akses masuk. Data dan riwayat pengguna tetap disimpan."}
      </p>
      {!self && (
        <form onReset={(event) => event.preventDefault()} action={action}>
          <input type="hidden" name="id" value={user.id} />
          <input type="hidden" name="active" value={String(!user.is_active)} />
          <p>
            Ubah akses masuk untuk <strong>{user.full_name}</strong>?
          </p>
          <Submit pending={pending}>
            {user.is_active ? "Ya, nonaktifkan" : "Ya, aktifkan"}
          </Submit>
        </form>
      )}
      <Feedback state={state} />
    </section>
  );
}
export function InvitationForm() {
  const [state, action, pending] = useConfirmedAction(createInvitation, {
    title: "Buat kode undangan?",
    text: "Kode ini membuka pendaftaran siswa dan guru sesuai kuota dan masa berlaku yang Anda isi.",
    confirmText: "Ya, buat undangan",
  });
  const [label, setLabel] = useState("");
  const [quota, setQuota] = useState("20");
  const [days, setDays] = useState("14");
  return (
    <form
      onReset={(event) => event.preventDefault()}
      action={action}
      className="panel form-panel"
    >
      <div className="field">
        <label htmlFor="label">Nama undangan</label>
        <input
          id="label"
          name="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
          maxLength={200}
          placeholder="Contoh: Pendaftaran tahun ajaran baru"
        />
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="max_uses">Kuota penggunaan</label>
          <input
            id="max_uses"
            name="max_uses"
            type="number"
            required
            min={1}
            max={1000}
            value={quota}
            onChange={(e) => setQuota(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="expires_in_days">Masa berlaku (hari)</label>
          <input
            id="expires_in_days"
            name="expires_in_days"
            type="number"
            required
            min={1}
            max={365}
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
        </div>
      </div>
      <p className="form-help">
        Kode dapat dipakai mendaftar sebagai siswa atau guru. Pengguna tidak
        otomatis bergabung ke kelas.
      </p>
      <Feedback state={state} />
      <div className="form-footer">
        <Link className="button secondary" href="/admin/undangan">
          Batal
        </Link>
        <Submit pending={pending}>Buat kode undangan</Submit>
      </div>
    </form>
  );
}
export function RevokeForm({ id, code }: { id: string; code: string }) {
  const [state, action, pending] = useConfirmedAction(revokeInvitation, {
    title: "Cabut kode undangan?",
    text: `Kode ${code} tidak dapat dipakai lagi. Akun yang sudah terdaftar tetap ada.`,
    confirmText: "Ya, cabut kode",
    destructive: true,
  });
  return (
    <div className="revoke-action">
      <form onReset={(event) => event.preventDefault()} action={action}>
        <input type="hidden" name="id" value={id} />
        <p>
          Kode <strong>{code}</strong> tidak akan bisa dipakai lagi. Akun yang
          sudah terdaftar tetap ada.
        </p>
        <Submit pending={pending}>Ya, cabut kode</Submit>
        <Feedback state={state} />
      </form>
    </div>
  );
}
export function CopyCode({ code }: { code: string }) {
  const [status, setStatus] = useState("");
  return (
    <>
      <button
        type="button"
        className="button small secondary"
        onClick={async () => {
          if (
            !(await confirmAction({
              title: "Salin kode undangan?",
              text: "Kode akan disalin ke clipboard. Bagikan hanya kepada calon pengguna sekolah.",
              confirmText: "Ya, salin",
            }))
          )
            return;
          try {
            await navigator.clipboard.writeText(code);
            setStatus("Kode disalin.");
            await notifyResult("Kode undangan berhasil disalin.");
          } catch {
            await notifyResult(
              "Belum dapat menyalin. Pilih teks kode lalu salin secara manual.",
              true,
            );
            setStatus(
              "Belum dapat menyalin. Pilih teks kode lalu salin secara manual.",
            );
          }
        }}
      >
        {status === "Kode disalin." ? (
          <Check size={16} aria-hidden="true" />
        ) : null}
        Salin
      </button>
      <span className="copy-status" role="status">
        {status}
      </span>
    </>
  );
}
