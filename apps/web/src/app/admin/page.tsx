import Link from "next/link";
import {
  ArrowUpRight,
  Users,
  UserCheck,
  Ticket,
  Plus,
  BookOpen,
} from "lucide-react";
import { requireSession } from "@/lib/session";
import { backend } from "@/lib/server-api";
import {
  dateLabel,
  invitationStatus,
  roleLabel,
  type User,
  type Invitation,
} from "@/lib/types";
import { Badge, Heading, Empty } from "@/components/ui";
import { AdminInsights } from "@/components/admin-insights";
import type { AdminActivity, AdminOverview } from "@/lib/admin-insights-types";
export default async function AdminPage() {
  const { token, user } = await requireSession("admin");
  const [users, invites, overview, activity] = await Promise.all([
    backend<User[]>("/admin/users", token),
    backend<Invitation[]>("/admin/invitations", token),
    backend<AdminOverview>("/admin/insights/overview", token),
    backend<AdminActivity>("/admin/activity?limit=8", token),
  ]);
  const active = users.filter((u) => u.is_active).length;
  return (
    <>
      <Heading
        title={`Selamat datang, ${user.full_name.split(" ")[0]}.`}
        description="Kelola akses, siapkan ruang belajar, dan dampingi sekolah Anda."
      >
        <Link className="button primary" href="/admin/pengguna/baru">
          <Plus size={18} aria-hidden="true" /> Tambah pengguna
        </Link>
      </Heading>
      <section className="dashboard-welcome">
        <div>
          <span className="welcome-label">
            <BookOpen size={16} aria-hidden="true" /> Mulai dari akses yang
            tepat
          </span>
          <h2>
            Ruang belajar yang baik,
            <br />
            dimulai bersama Anda.
          </h2>
          <p>
            Pastikan guru dan siswa memiliki akses untuk melangkah ke perjalanan
            belajar berikutnya.
          </p>
          <Link href="/admin/undangan/baru" className="button white">
            Buat undangan <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <BookOpen strokeWidth={0.8} />
        </div>
      </section>
      <div className="metrics">
        {[
          {
            label: "Total pengguna",
            value: users.length,
            detail: "Akun terdaftar",
            Icon: Users,
          },
          {
            label: "Pengguna aktif",
            value: active,
            detail: `${users.length - active} akun nonaktif`,
            Icon: UserCheck,
          },
          {
            label: "Undangan aktif",
            value: invites.filter((i) => invitationStatus(i) === "Aktif")
              .length,
            detail: "Kode yang masih dapat dipakai",
            Icon: Ticket,
          },
        ].map(({ label, value, detail, Icon }) => (
          <section className="metric" key={label}>
            <div>
              <span>{label}</span>
              <Icon size={20} aria-hidden="true" />
            </div>
            <strong>{value}</strong>
            <small>{detail}</small>
          </section>
        ))}
      </div>
      <section className="panel table-panel">
        <div className="panel-heading">
          <div>
            <h2>Pengguna terbaru</h2>
            <p>Akun yang baru bergabung di KODMOD.</p>
          </div>
          <Link href="/admin/pengguna" className="text-link">
            Lihat semua <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
        {users.length ? (
          <table>
            <thead>
              <tr>
                <th>Pengguna</th>
                <th>Peran</th>
                <th>Bergabung</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.slice(0, 5).map((u) => (
                <tr key={u.id}>
                  <td>
                    <Link
                      className="user-link"
                      href={`/admin/pengguna/${u.id}`}
                    >
                      <span className="avatar" aria-hidden="true">
                        {u.full_name.slice(0, 1)}
                      </span>
                      <span>
                        <strong>{u.full_name}</strong>
                        <small>@{u.username}</small>
                      </span>
                    </Link>
                  </td>
                  <td data-label="Peran">{roleLabel[u.role]}</td>
                  <td data-label="Bergabung">{dateLabel(u.created_at)}</td>
                  <td>
                    <Badge active={u.is_active}>
                      {u.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty title="Belum ada pengguna">
            Tambahkan akun untuk mulai menyiapkan akses sekolah.
          </Empty>
        )}
      </section>
      <AdminInsights initialOverview={overview} initialActivity={activity} />
    </>
  );
}
