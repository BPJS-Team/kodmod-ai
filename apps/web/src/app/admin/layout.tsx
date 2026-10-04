
import { UiText } from "@/components/language-provider";
import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { Brand } from "@/components/ui";
import { AdminNav } from "@/components/admin-nav";
import { requireSession } from "@/lib/session";
import { LogoutButton } from "@/components/logout-button";
import { ExperienceToolbar } from "@/components/experience-toolbar";
import { getServerI18n } from "@/lib/server-language";
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = await requireSession("admin");
  const { t } = await getServerI18n();
  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-label">{t("Ruang administrasi")}</div>
        <AdminNav />
        <div className="sidebar-bottom">
          <ShieldCheck size={22} aria-hidden="true" />
          <strong>KODMOD</strong>
          <p>{t("Ruang belajar untuk semua.")}</p>
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="workspace-header">
          <span className="workspace-title">{t("Ruang admin")}</span>
          <div className="account">
            <ExperienceToolbar />
            <span className="avatar" aria-hidden="true">
              {user.full_name.slice(0, 1).toUpperCase()}
            </span>
            <span>
              <strong>{user.full_name}</strong>
              <small><UiText>{"Administrator"}</UiText></small>
            </span>
            <LogoutButton compact />
          </div>
        </header>
        <main id="konten-utama" tabIndex={-1} className="workspace-main">
          {children}
        </main>
        <footer className="workspace-footer">
          KODMOD <span>{t("Ruang belajar untuk semua.")}</span>
        </footer>
      </div>
    </div>
  );
}
