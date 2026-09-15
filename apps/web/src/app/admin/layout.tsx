import type { ReactNode } from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/ui";
import { AdminNav } from "@/components/admin-nav";
import { requireSession } from "@/lib/session";
import { logout } from "@/app/actions";
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = await requireSession("admin");
  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-label">Ruang administrasi</div>
        <AdminNav />
        <div className="sidebar-bottom">
          <ShieldCheck size={22} aria-hidden="true" />
          <strong>Akses sekolah terkelola</strong>
          <p>Ruang belajar dimulai dari akses yang tepat.</p>
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="workspace-header">
          <span className="workspace-title">Ruang admin</span>
          <div className="account">
            <span className="avatar" aria-hidden="true">
              {user.full_name.slice(0, 1).toUpperCase()}
            </span>
            <span>
              <strong>{user.full_name}</strong>
              <small>Administrator</small>
            </span>
            <form action={logout}>
              <button
                className="icon-button"
                title="Keluar"
                aria-label="Keluar dari akun"
              >
                <LogOut size={19} />
              </button>
            </form>
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
