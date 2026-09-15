import { requireSession } from "@/lib/session";
import { Heading } from "@/components/ui";
import { InvitationForm } from "@/components/forms";
export default async function NewInvitationPage() {
  await requireSession("admin");
  return (
    <>
      <Heading
        title="Buat undangan"
        description="Atur berapa orang yang bisa bergabung dan kapan kode berakhir."
      />
      <InvitationForm />
    </>
  );
}
