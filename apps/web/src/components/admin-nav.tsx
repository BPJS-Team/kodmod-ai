"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Ticket, ChevronRight } from "lucide-react";
const links = [
  { href: "/admin", label: "Ringkasan", Icon: LayoutDashboard },
  { href: "/admin/pengguna", label: "Pengguna", Icon: Users },
  { href: "/admin/undangan", label: "Kode undangan", Icon: Ticket },
];
export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="admin-nav" aria-label="Navigasi admin">
      {links.map(({ href, label, Icon }) => {
        const active =
          href === "/admin" ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={20} aria-hidden="true" />
            <span>{label}</span>
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
