"use client";

import Swal from "sweetalert2";

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
    confirmButtonText: "Mengerti",
    cancelButtonText: "Batal",
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
  if (Swal.isVisible()) return false;
  const result = await dialog().fire({
    titleText: options.title,
    text: options.text,
    icon: options.destructive ? "warning" : "question",
    iconColor: options.destructive ? "#b66b11" : "#2565e9",
    showCancelButton: true,
    focusCancel: true,
    reverseButtons: true,
    confirmButtonText: options.confirmText || "Ya, lanjutkan",
  });
  return result.isConfirmed;
}

export async function notifyResult(message: string, error = false) {
  await dialog().fire({
    titleText: error ? "Belum berhasil" : "Berhasil",
    text: message,
    icon: error ? "error" : "success",
    iconColor: error ? "#c44343" : "#23856d",
  });
}
