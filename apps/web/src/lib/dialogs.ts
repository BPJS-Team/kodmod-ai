"use client";

import Swal from "sweetalert2";
import { translate, type Language } from "@/lib/i18n.mjs";

const t = (text: string) => translate(text, document.documentElement.lang as Language);

function announceDialog(text: string) {
  if (typeof window === "undefined" || typeof CustomEvent === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent("kodmod:dialog-announce", { detail: { text } }));
  } catch {
    // Ignore if window is not available
  }
}

async function waitForNativeDialog() {
  if (!document.querySelector("dialog[open]")) return;
  await new Promise<void>(resolve => {
    const observer = new MutationObserver(() => {
      if (!document.querySelector("dialog[open]")) { observer.disconnect(); resolve(); }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["open"], childList: true, subtree: true });
  });
}

const dialog = () =>
  Swal.mixin({
    customClass: {
      popup: "kodmod-dialog",
      title: "kodmod-dialog-title",
      htmlContainer: "kodmod-dialog-body",
      confirmButton: "button primary",
      cancelButton: "button secondary",
      actions: "kodmod-dialog-actions",
    },
    buttonsStyling: false,
    confirmButtonText: t("Mengerti"),
    cancelButtonText: t("Batal"),
    heightAuto: false,
    returnFocus: true,
    allowOutsideClick: false,
    animation: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  });

export type Confirmation = {
  title: string;
  text: string;
  confirmText?: string;
  destructive?: boolean;
};
export async function confirmAction(options: Confirmation) {
  await waitForNativeDialog();
  if (Swal.isVisible()) return false;
  announceDialog(`${t(options.title)}. ${t(options.text)}`);
  const result = await dialog().fire({
    titleText: t(options.title),
    text: t(options.text),
    icon: options.destructive ? "warning" : "question",
    iconColor: options.destructive ? "#b66b11" : "#2565e9",
    showCancelButton: true,
    focusCancel: true,
    reverseButtons: true,
    confirmButtonText: t(options.confirmText || "Ya, lanjutkan"),
  });
  return result.isConfirmed;
}

export async function notifyResult(message: string, error = false) {
  await waitForNativeDialog();
  const title = t(error ? "Belum berhasil" : "Berhasil");
  announceDialog(`${title}. ${t(message)}`);
  await dialog().fire({
    titleText: title,
    text: t(message),
    icon: error ? "error" : "success",
    iconColor: error ? "#c44343" : "#23856d",
  });
}
