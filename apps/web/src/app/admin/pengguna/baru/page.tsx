
import { UiText } from "@/components/language-provider";
import { requireSession } from "@/lib/session";
import { Heading } from "@/components/ui";
import { UserForm } from "@/components/forms";
export default async function NewUserPage() {
  await requireSession("admin");
  return (
    <>
      <Heading
        title={<UiText>{"Tambah pengguna"}</UiText>}
        description={<UiText>{"Berikan akses yang sesuai untuk anggota sekolah."}</UiText>}
      />
      <UserForm />
    </>
  );
}
