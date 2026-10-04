
import { UiText } from "@/components/language-provider";
import Link from "next/link";
import { Plus, Search, ArrowUpRight } from "lucide-react";
import { backend } from "@/lib/server-api";
import { requireSession } from "@/lib/session";
import { roleLabel, type User } from "@/lib/types";
import { Heading, Badge, Empty } from "@/components/ui";
export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await requireSession("admin");
  const params = await searchParams,
    q = typeof params.q === "string" ? params.q.slice(0, 100) : "",
    role =
      typeof params.role === "string" &&
      ["student", "teacher", "admin"].includes(params.role)
        ? params.role
        : "";
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (role) query.set("role", role);
  const users = await backend<User[]>(`/admin/users?${query}`, token);
  return (
    <>
      <Heading
        title={<UiText>{"Pengguna"}</UiText>}
        description={<UiText>{"Orang-orang di balik setiap perjalanan belajar."}</UiText>}
      >
        <Link className="button primary" href="/admin/pengguna/baru">
          <Plus size={18} aria-hidden="true" /><UiText>{"Tambah pengguna"}</UiText></Link>
      </Heading>
      {params.success === "saved" && (
        <p className="alert success-message" role="status"><UiText>{"Data pengguna berhasil disimpan."}</UiText></p>
      )}
      <form className="filters" action="/admin/pengguna">
        <div className="field search-field">
          <label htmlFor="q"><UiText>{"Cari pengguna"}</UiText></label>
          <div>
            <Search size={18} aria-hidden="true" />
            <input
              name="q"
              id="q"
              defaultValue={q}
              placeholder="Nama atau username"
              maxLength={100}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="role"><UiText>{"Peran"}</UiText></label>
          <select id="role" name="role" defaultValue={role}>
            <option value=""><UiText>{"Semua peran"}</UiText></option>
            {Object.entries(roleLabel).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button className="button secondary" type="submit"><UiText>{"Terapkan"}</UiText></button>
        {(q || role) && (
          <Link href="/admin/pengguna" className="text-link"><UiText>{"Reset filter"}</UiText></Link>
        )}
      </form>
      <section className="panel table-panel">
        <div className="panel-heading">
          <h2><UiText>{"Daftar pengguna"}</UiText><span className="count">{users.length}</span>
          </h2>
        </div>
        {users.length ? (
          <table>
            <thead>
              <tr>
                <th><UiText>{"Nama pengguna"}</UiText></th>
                <th><UiText>{"Peran"}</UiText></th>
                <th><UiText>{"Status"}</UiText></th>
                <th><UiText>{"Aksi"}</UiText></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="user-link">
                      <span className="avatar" aria-hidden="true">
                        {u.full_name.slice(0, 1)}
                      </span>
                      <span>
                        <strong>{u.full_name}</strong>
                        <small>@{u.username}</small>
                      </span>
                    </div>
                  </td>
                  <td data-label="Peran">{<UiText>{roleLabel[u.role]}</UiText>}</td>
                  <td>
                    <Badge active={u.is_active}>
                      {u.is_active ? <UiText>{"Aktif"}</UiText> : <UiText>{"Nonaktif"}</UiText>}
                    </Badge>
                  </td>
                  <td>
                    <Link
                      className="text-link"
                      href={`/admin/pengguna/${u.id}`}
                      aria-label={`Kelola ${u.full_name}`}
                    ><UiText>{"Kelola"}</UiText><ArrowUpRight size={16} aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty
            title={
              q || role
                ? "Belum ada hasil yang cocok"
                : "Ruang ini menunggu pengguna pertama"
            }
          >
            {q || role
              ? <UiText>{"Coba nama lain atau reset filter untuk melihat seluruh pengguna."}</UiText>
              : <UiText>{"Tambahkan akun siswa, guru, atau administrator melalui tombol di atas."}</UiText>}
          </Empty>
        )}
        <div className="table-footer">{users.length}<UiText>{" pengguna ditampilkan"}</UiText></div>
      </section>
    </>
  );
}
