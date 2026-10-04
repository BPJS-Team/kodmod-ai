
import type { ReactNode } from "react";
import { BookOpen } from "lucide-react";
import { Brand } from "./ui";
import { LearningNav } from "./learning-nav";
import { requireSession } from "@/lib/session";
import type { LearningRole } from "@/lib/class-types";
import "@/styles/learning.css";
import { ExperienceToolbar } from "./experience-toolbar";
import { getServerI18n } from "@/lib/server-language";
import { UserProfileDropdown } from "./user-profile-dropdown";
export async function LearningShell({
  role,
  children,
}: {
  role: LearningRole;
  children: ReactNode;
}) {
  const { user } = await requireSession(role);
  const { t } = await getServerI18n();
  const teacher = role === "teacher";
  return (
    <div className="admin-shell learning-shell">
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-label">
          {t(teacher ? "Ruang mengajar" : "Ruang belajar")}
        </div>
        <LearningNav base={teacher ? "/guru" : "/siswa"} />
        <div className="sidebar-bottom">
          <BookOpen size={24} aria-hidden="true" />
          <strong>KODMOD</strong>
          <p>{t("Ruang belajar untuk semua.")}</p>
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="workspace-header">
          <span className="workspace-title">
            {t(teacher ? "Ruang guru" : "Ruang siswa")}
          </span>
          <div className="account">
            <ExperienceToolbar />
            <UserProfileDropdown
              user={user}
              roleLabel={teacher ? "Guru" : "Siswa"}
              role={role}
            />
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
