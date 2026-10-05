"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useI18n } from "./language-provider";
import { Button } from "./ui/button";

export function RefreshButton({ label = "Perbarui data", disabled = false, className, size }: {
  label?: string; disabled?: boolean; className?: string; size?: "default" | "sm";
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <span className="refresh-control">
    <Button type="button" variant="outline" size={size} className={className} disabled={disabled}
      loading={pending} loadingText={t("Memperbarui data…")} onClick={() => startTransition(() => router.refresh())}>
      <RefreshCw size={16} aria-hidden="true" />{t(label)}
    </Button>
    <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{pending && t("Memperbarui data…")}</span>
  </span>;
}
