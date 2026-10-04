"use client";

import { useTransition, useRef } from "react";
import { LogOut, LoaderCircle } from "lucide-react";
import { logout } from "@/app/actions";
import { confirmAction } from "@/lib/dialogs";
import { useI18n } from "./language-provider";
import { speechOutput } from "@/lib/browser-speech";

export function LogoutButton({
  compact = false,
  variant,
}: {
  compact?: boolean;
  variant?: "button" | "compact" | "nav";
}) {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);

  const isNav = variant === "nav";
  const isCompact = variant === "compact" || (compact && !variant);

  const buttonClass = isNav
    ? "admin-nav-item admin-nav-logout"
    : isCompact
      ? "icon-button"
      : "button secondary";

  return (
    <button
      type="button"
      className={buttonClass}
      aria-label={t("Keluar dari akun")}
      data-voice-menu="logout"
      disabled={pending}
      onClick={async () => {
        if (busy.current) return;
        busy.current = true;
        speechOutput.stop();
        const confirmed = await confirmAction({
          title: "Yakin ingin keluar?",
          text: "Anda perlu masuk kembali untuk mengakses ruang KODMOD.",
          confirmText: "Ya, keluar",
          destructive: true,
        });
        if (confirmed)
          startTransition(async () => {
            try {
              await logout();
            } finally {
              busy.current = false;
            }
          });
        else busy.current = false;
      }}
    >
      {pending ? (
        <LoaderCircle className="spin" size={isNav ? 20 : 19} aria-hidden="true" />
      ) : (
        <LogOut size={isNav ? 20 : 19} aria-hidden="true" />
      )}
      {!isCompact && <span>{t(pending ? "Keluar…" : "Keluar")}</span>}
    </button>
  );
}
