
import { UiText } from "@/components/language-provider";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { backend } from "@/lib/server-api";
import { type User, dateLabel } from "@/lib/types";
import { Heading, Badge } from "@/components/ui";
import { StatusForm, UserForm } from "@/components/forms";
export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { token, user: admin } = await requireSession("admin"),
    { id } = await params;
  const users = await backend<User[]>("/admin/users", token),
    user = users.find((u) => u.id === id);
  if (!user) notFound();
  return (
    <>
      <Heading
        title={user.full_name}
        description={`@${user.username} · Terakhir masuk: ${dateLabel(user.last_login_at)}`}
      >
        <Badge active={user.is_active}>
          {user.is_active ? <UiText>{"Aktif"}</UiText> : <UiText>{"Nonaktif"}</UiText>}
        </Badge>
      </Heading>
      <UserForm user={user} self={user.id === admin.id} />
      <StatusForm
        user={user}
        self={user.id === admin.id}
      />
    </>
  );
}
