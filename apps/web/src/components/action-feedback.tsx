"use client";

import { useActionState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { confirmAction, notifyResult, type Confirmation } from "@/lib/dialogs";
import type { ActionState } from "@/lib/types";

export function useConfirmedAction(
  action: (state: ActionState, data: FormData) => Promise<ActionState>,
  confirmation: Confirmation,
) {
  return useActionState(async (state: ActionState, data: FormData) => {
    const trigger = document.activeElement;
    if (!(await confirmAction(confirmation))) {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (trigger instanceof HTMLElement && trigger.isConnected)
            trigger.focus();
        }),
      );
      return state;
    }
    return action(state, data);
  }, {});
}

export function ActionFeedback({ state }: { state: ActionState }) {
  const shown = useRef<ActionState | null>(null);
  useEffect(() => {
    if (shown.current === state) return;
    shown.current = state;
    if (state.error || state.success)
      void notifyResult(state.error || state.success || "", !!state.error);
  }, [state]);
  return (
    <div aria-live="polite" aria-atomic="true">
      {state.error && <p className="alert error-message">{state.error}</p>}
      {state.success && (
        <p className="alert success-message">{state.success}</p>
      )}
    </div>
  );
}

const messages: Record<string, string> = {
  "class-created":
    "Kelas berhasil dibuat. Tambahkan siswa dan materi untuk mulai belajar.",
  "material-saved": "Materi berhasil disimpan sesuai status publikasinya.",
  "signed-in": "Anda berhasil masuk. Selamat datang di ruang KODMOD.",
  registered:
    "Akun berhasil dibuat. Selamat memulai perjalanan bersama KODMOD.",
  "signed-out": "Anda sudah keluar dari akun dengan aman.",
  saved: "Data pengguna berhasil disimpan.",
  created: "Undangan berhasil dibuat. Salin kode untuk dibagikan.",
  revoked: "Kode undangan dicabut. Akun yang sudah terdaftar tetap ada.",
};

export function RedirectFeedback() {
  const params = useSearchParams();
  const handled = useRef<string | null>(null);
  const code = params.get("success");
  useEffect(() => {
    if (!code) {
      handled.current = null;
      return;
    }
    if (!Object.hasOwn(messages, code) || handled.current === code) return;
    handled.current = code;
    const url = new URL(window.location.href);
    url.searchParams.delete("success");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    void notifyResult(messages[code]);
  }, [code]);
  return null;
}
