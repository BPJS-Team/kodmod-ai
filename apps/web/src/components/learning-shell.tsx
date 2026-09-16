import type { ReactNode } from "react";
import { BookOpen } from "lucide-react";
import { Brand } from "./ui";
import { LearningNav } from "./learning-nav";
import { LogoutButton } from "./logout-button";
import { requireSession } from "@/lib/session";
import type { LearningRole } from "@/lib/class-types";
import "@/styles/learning.css";
export async function LearningShell({
  role,
  children,
}: {
  role: LearningRole;
  children: ReactNode;
}) {
  const { user } = await requireSession(role);
  const teacher = role === "teacher";
  return (
    <div className="admin-shell learning-shell">
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-label">
          Ruang {teacher ? "mengajar" : "belajar"}
        </div>
        <LearningNav base={teacher ? "/guru" : "/siswa"} />
        <div className="sidebar-bottom">
          <BookOpen size={24} aria-hidden="true" />
          <strong>Selangkah lebih paham.</strong>
          <p>
            {teacher
              ? "Bangun ruang belajar yang membuka kesempatan."
              : "Temukan pengetahuan, dengan langkahmu sendiri."}
          </p>
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="workspace-header">
          <span className="workspace-title">
            Ruang {teacher ? "guru" : "siswa"}
          </span>
          <div className="account">
            <span className="avatar" aria-hidden="true">
              {user.full_name.slice(0, 1).toUpperCase()}
            </span>
            <span>
              <strong>{user.full_name}</strong>
              <small>{teacher ? "Guru" : "Siswa"}</small>
            </span>
            <LogoutButton compact />
          </div>
        </header>
        <main id="konten-utama" tabIndex={-1} className="workspace-main">
          {children}
        </main>
        <footer className="workspace-footer">
          KODMOD <span>Ruang belajar untuk semua.</span>
        </footer>
      </div>
    </div>
  );
}
