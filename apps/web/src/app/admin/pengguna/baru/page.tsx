import { requireSession } from "@/lib/session";
import { Heading } from "@/components/ui";
import { UserForm } from "@/components/forms";
export default async function NewUserPage() {
  await requireSession("admin");
  return (
    <>
      <Heading
        title="Tambah pengguna"
        description="Berikan akses yang sesuai untuk anggota sekolah."
      />
      <UserForm />
    </>
  );
}
