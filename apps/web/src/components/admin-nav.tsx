"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, LayoutDashboard, Users, ChevronRight, FileCheck2 } from "lucide-react";
import { useI18n } from "./language-provider";
const links = [
  { href: "/admin", label: "Ringkasan", Icon: LayoutDashboard },
  { href: "/admin/pengguna", label: "Pengguna", Icon: Users },
  { href: "/admin/review-kuis", label: "Review kuis", Icon: FileCheck2 },
  { href: "/admin/aktivitas", label: "Aktivitas & layanan", Icon: Activity },
];
export function AdminNav() {
  const { t } = useI18n();
  const path = usePathname();
  return (
    <nav className="admin-nav" aria-label={t("Navigasi admin")}>
      {links.map(({ href, label, Icon }) => {
        const active =
          href === "/admin" ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            data-voice-menu={{ "/admin": "dashboard", "/admin/pengguna": "users", "/admin/review-kuis": "review", "/admin/aktivitas": "activity" }[href]}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={20} aria-hidden="true" />
            <span>{t(label)}</span>
            {active && (
              <ChevronRight
                className="nav-arrow"
                size={16}
                aria-hidden="true"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
