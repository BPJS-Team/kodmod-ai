"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { confirmAction } from "@/lib/dialogs";

export function useQuizExitGuard(active: boolean, unsaved = false) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    let confirming = false;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const next = new URL(link.href, window.location.href);
      if (next.origin !== window.location.origin || next.href === window.location.href || (next.pathname === window.location.pathname && next.search === window.location.search)) return;
      event.preventDefault();
      event.stopPropagation();
      if (confirming) return;
      confirming = true;
      void confirmAction({ title: "Tinggalkan kuis sementara?", text: unsaved ? "Pilihan terbaru belum disimpan. Jawaban yang sudah tersimpan dapat dilanjutkan saat kembali." : "Jawaban yang sudah dikirim tetap tersimpan. Kamu dapat melanjutkan sesi ini saat kembali.", confirmText: "Ya, keluar sementara" }).then((allowed) => {
        if (allowed) router.push(next.pathname + next.search + next.hash);
      }).finally(() => { confirming = false; });
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", click, true); };
  }, [active, unsaved, router]);
}
