"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  ChevronDown,
  LogOut,
  User,
  ShieldCheck,
  GraduationCap,
  BookOpen,
  LoaderCircle,
} from "lucide-react";
import { logout } from "@/app/actions";
import { confirmAction } from "@/lib/dialogs";
import { useI18n } from "./language-provider";
import { speechOutput } from "@/lib/browser-speech";

export function UserProfileDropdown({
  user,
  roleLabel,
  role = "student",
}: {
  user: { full_name: string; username: string };
  roleLabel: string;
  role?: "admin" | "teacher" | "student";
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && open) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function handleLogout() {
    speechOutput.stop();
    setOpen(false);
    const confirmed = await confirmAction({
      title: "Yakin ingin keluar?",
      text: "Anda perlu masuk kembali untuk mengakses ruang KODMOD.",
      confirmText: "Ya, keluar",
      destructive: true,
    });
    if (confirmed) {
      startTransition(async () => {
        await logout();
      });
    }
  }

  const roleIcon =
    role === "admin" ? (
      <ShieldCheck size={16} aria-hidden="true" />
    ) : role === "teacher" ? (
      <GraduationCap size={16} aria-hidden="true" />
    ) : (
      <BookOpen size={16} aria-hidden="true" />
    );

  const initial = user.full_name.trim().slice(0, 1).toUpperCase() || "U";

  return (
    <div className="profile-dropdown-container">
      <button
        ref={triggerRef}
        type="button"
        className={`profile-dropdown-trigger ${open ? "open" : ""}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("Menu profil pengguna")}
      >
        <span className="avatar" aria-hidden="true">
          {initial}
        </span>
        <div className="profile-dropdown-text">
          <strong>{user.full_name}</strong>
          <small>{t(roleLabel)}</small>
        </div>
        <ChevronDown
          size={15}
          className={`profile-dropdown-chevron ${open ? "rotate" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          className="profile-dropdown-menu"
          role="menu"
          aria-label={t("Profil pengguna")}
        >
          <div className="profile-dropdown-header">
            <span className="avatar large" aria-hidden="true">
              {initial}
            </span>
            <div className="profile-dropdown-info">
              <strong className="profile-name">{user.full_name}</strong>
              <span className="profile-username">@{user.username}</span>
              <span className="profile-badge">
                {roleIcon}
                <span>{t(roleLabel)}</span>
              </span>
            </div>
          </div>

          <div className="profile-dropdown-divider" />

          <div className="profile-dropdown-links">
            {role === "admin" && (
              <Link
                href="/admin"
                className="profile-dropdown-item"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                <ShieldCheck size={17} aria-hidden="true" />
                <span>{t("Ruang administrasi")}</span>
              </Link>
            )}
            {role === "teacher" && (
              <Link
                href="/guru"
                className="profile-dropdown-item"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                <GraduationCap size={17} aria-hidden="true" />
                <span>{t("Ruang mengajar")}</span>
              </Link>
            )}
            {role === "student" && (
              <Link
                href="/siswa/progres"
                className="profile-dropdown-item"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                <User size={17} aria-hidden="true" />
                <span>{t("Progres saya")}</span>
              </Link>
            )}
          </div>

          <div className="profile-dropdown-divider" />

          <button
            type="button"
            className="profile-dropdown-item logout"
            role="menuitem"
            disabled={pending}
            onClick={() => void handleLogout()}
          >
            {pending ? (
              <LoaderCircle className="spin" size={17} aria-hidden="true" />
            ) : (
              <LogOut size={17} aria-hidden="true" />
            )}
            <span>{t(pending ? "Keluar…" : "Keluar dari akun")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
