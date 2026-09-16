"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Library, BookOpen } from "lucide-react";
export function LearningNav({ base }: { base: string }) {
  const path = usePathname();
  return (
    <nav className="admin-nav" aria-label="Menu ruang belajar">
      {[
        { href: base, title: "Dashboard", icon: LayoutDashboard },
        { href: `${base}/kelas`, title: "Kelas saya", icon: Library },
        ...(base === "/siswa"
          ? [{ href: "/siswa/materi", title: "Pustaka materi", icon: BookOpen }]
          : []),
      ].map(({ href, title, icon: Icon }) => {
        const active = href === base ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={active ? "active" : ""}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={19} aria-hidden="true" />
            {title}
          </Link>
        );
      })}
    </nav>
  );
}
