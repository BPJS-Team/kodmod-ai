
import { UiText, UiDate } from "@/components/language-provider";
import Link from "next/link";
import {
  ArrowUpRight,
  Users,
  UserCheck,
  Plus,
  BookOpen,
} from "lucide-react";
import { requireSession } from "@/lib/session";
import { backend } from "@/lib/server-api";
import {
  roleLabel,
  type User,
} from "@/lib/types";
import { Badge, Heading, Empty } from "@/components/ui";
import { AdminInsights } from "@/components/admin-insights";
import type { AdminActivity, AdminOverview } from "@/lib/admin-insights-types";
export default async function AdminPage() {
  const { token, user } = await requireSession("admin");
  const [users, overview, activity] = await Promise.all([
    backend<User[]>("/admin/users", token),
    backend<AdminOverview>("/admin/insights/overview", token),
    backend<AdminActivity>("/admin/activity?limit=8", token),
  ]);
  const active = users.filter((u) => u.is_active).length;
  return (
    <>
      <Heading
        title={`Selamat datang, ${user.full_name.split(" ")[0]}.`}
        description={<UiText>{"Kelola akses, siapkan ruang belajar, dan dampingi sekolah Anda."}</UiText>}
      >
        <Link className="button primary" href="/admin/pengguna/baru">
          <Plus size={18} aria-hidden="true" /><UiText>{"Tambah pengguna"}</UiText></Link>
      </Heading>
      <section className="dashboard-welcome">
        <div>
          <span className="welcome-label">
            <BookOpen size={16} aria-hidden="true" /><UiText>{"Mulai dari akses yang tepat"}</UiText></span>
          <h2><UiText>{"Ruang belajar yang baik,"}</UiText><br /><UiText>{"dimulai bersama Anda."}</UiText></h2>
          <p><UiText>{"Pastikan guru dan siswa memiliki akses untuk melangkah ke perjalanan belajar berikutnya."}</UiText></p>
          <Link href="/admin/pengguna" className="button white"><UiText>{"Kelola pengguna"}</UiText><ArrowUpRight size={18} aria-hidden="true" />
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
            label: "Guru terdaftar",
            value: users.filter((u) => u.role === "teacher").length,
            detail: "Akun pengajar",
            Icon: BookOpen,
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
            <h2><UiText>{"Pengguna terbaru"}</UiText></h2>
            <p><UiText>{"Akun yang baru bergabung di KODMOD."}</UiText></p>
          </div>
          <Link href="/admin/pengguna" className="text-link"><UiText>{"Lihat semua"}</UiText><ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
        {users.length ? (
          <table>
            <thead>
              <tr>
                <th><UiText>{"Pengguna"}</UiText></th>
                <th><UiText>{"Peran"}</UiText></th>
                <th><UiText>{"Bergabung"}</UiText></th>
                <th><UiText>{"Status"}</UiText></th>
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
                  <td data-label="Peran">{<UiText>{roleLabel[u.role]}</UiText>}</td>
                  <td data-label="Bergabung">{<UiDate value={u.created_at} />}</td>
                  <td>
                    <Badge active={u.is_active}>
                      {u.is_active ? <UiText>{"Aktif"}</UiText> : <UiText>{"Nonaktif"}</UiText>}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty title={<UiText>{"Belum ada pengguna"}</UiText>}><UiText>{"Tambahkan akun untuk mulai menyiapkan akses sekolah."}</UiText></Empty>
        )}
      </section>
      <AdminInsights initialOverview={overview} initialActivity={activity} />
    </>
  );
}
