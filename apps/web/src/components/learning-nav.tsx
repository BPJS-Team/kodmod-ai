"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "./language-provider";
import {
  LayoutDashboard,
  Library,
  BookOpen,
  ListChecks,
  MessageCircle,
  LineChart,
} from "lucide-react";
export function LearningNav({ base }: { base: string }) {
  const { t } = useI18n();
  const path = usePathname();
  return (
    <nav className="admin-nav" aria-label={t("Menu ruang belajar")}>
      {[
        { href: base, title: "Dashboard", icon: LayoutDashboard },
      { href: `${base}/kelas`, title: "Kelas saya", icon: Library },
        ...(base === "/guru"
          ? [
              { href: "/guru/kuis", title: "Kuis & penugasan", icon: ListChecks },
              { href: "/guru/review-kuis", title: "Review kuis", icon: BookOpen },
              { href: "/guru/analitik", title: "Analitik siswa", icon: LineChart },
            ]
          : []),
        ...(base === "/siswa"
          ? [
              { href: "/siswa/materi", title: "Pustaka materi", icon: BookOpen },
              { href: "/siswa/tutor", title: "Tutor AI", icon: MessageCircle },
              { href: "/siswa/latihan", title: "Latihan", icon: ListChecks },
              { href: "/siswa/tugas", title: "Tugas dari guru", icon: BookOpen },
              { href: "/siswa/progres", title: "Progres saya", icon: LineChart },
            ]
          : []),
      ].map(({ href, title, icon: Icon }) => {
        const active = href === base ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            data-voice-menu={href === base ? "dashboard" : ({ kelas: "classes", materi: "materials", tutor: "tutor", latihan: "practice", tugas: "assignments", progres: "progress", kuis: "quizzes", "review-kuis": "review", analitik: "analytics" } as Record<string, string>)[href.split("/").at(-1) ?? ""]}
            className={active ? "active" : ""}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={19} aria-hidden="true" />
            {t(title)}
          </Link>
        );
      })}
    </nav>
  );
}
