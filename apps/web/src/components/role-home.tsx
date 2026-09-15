import { Brand, Heading } from "./ui";
import { BookOpen, LogOut } from "lucide-react";
import { logout } from "@/app/actions";
import { requireSession } from "@/lib/session";
export async function RoleHome({ role }: { role: "student" | "teacher" }) {
  const { user } = await requireSession(role);
  return (
    <div className="role-page">
      <header className="site-header">
        <Brand />
        <form action={logout}>
          <button className="button secondary">
            Keluar <LogOut size={17} aria-hidden="true" />
          </button>
        </form>
      </header>
      <main id="konten-utama" tabIndex={-1}>
        <Heading
          title={`Halo, ${user.full_name}.`}
          description={
            role === "student"
              ? "Selamat datang di ruang belajar Anda."
              : "Selamat datang di ruang mengajar Anda."
          }
        />
        <section className="panel role-placeholder">
          <BookOpen size={42} strokeWidth={1.2} aria-hidden="true" />
          <h2>Akun Anda sudah terhubung.</h2>
          <p>
            Ruang {role === "student" ? "belajar siswa" : "mengajar guru"}{" "}
            sedang disiapkan. Fitur materi, tutor, dan kuis akan hadir pada
            tahap berikutnya.
          </p>
          <span className="badge">
            Masuk sebagai {role === "student" ? "siswa" : "guru"}
          </span>
        </section>
      </main>
    </div>
  );
}
