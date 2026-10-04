"use client";

import { useTransition, useRef } from "react";
import { LogOut, LoaderCircle } from "lucide-react";
import { logout } from "@/app/actions";
import { confirmAction } from "@/lib/dialogs";
import { useI18n } from "./language-provider";
import { speechOutput } from "@/lib/browser-speech";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);
  return (
    <button
      type="button"
      className={compact ? "icon-button" : "button secondary"}
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
      {!compact && t(pending ? "Keluar…" : "Keluar")}
      {pending ? (
        <LoaderCircle className="spin" size={19} aria-hidden="true" />
      ) : (
        <LogOut size={19} aria-hidden="true" />
      )}
    </button>
  );
}
