import Link from "next/link";
import { Plus, Ticket } from "lucide-react";
import { requireSession } from "@/lib/session";
import { backend } from "@/lib/server-api";
import { type Invitation, dateLabel, invitationStatus } from "@/lib/types";
import { Heading, Badge, Empty } from "@/components/ui";
import { CopyCode, RevokeForm } from "@/components/forms";
export default async function InvitationsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const { token } = await requireSession("admin");
  const invites = await backend<Invitation[]>("/admin/invitations", token);
  const { success } = await searchParams;
  return (
    <>
      <Heading
        title="Kode undangan"
        description="Sambut siswa dan guru ke ruang belajar mereka."
      >
        <Link className="button primary" href="/admin/undangan/baru">
          <Plus size={18} aria-hidden="true" /> Buat undangan
        </Link>
      </Heading>
      {success === "created" && (
        <p className="alert success-message" role="status">
          Undangan berhasil dibuat. Salin kode untuk dibagikan.
        </p>
      )}
      {success === "revoked" && <p className="alert success-message" role="status">Kode undangan dicabut. Akun yang sudah terdaftar tetap ada.</p>}
      <div className="info-note">
        <Ticket size={21} aria-hidden="true" />
        <p>
          Kode membuka akses pendaftaran siswa atau guru. Akun admin dibuat
          langsung melalui menu Pengguna.
        </p>
      </div>
      <div className="invitation-grid">
        {invites.map((i) => {
          const status = invitationStatus(i);
          return (
            <section className="panel invitation-card" key={i.id}>
              <div className="panel-heading">
                <h2>{i.label || "Undangan tanpa nama"}</h2>
                <Badge active={status === "Aktif"}>{status}</Badge>
              </div>
              <div className="invitation-code">
                <code>{i.code}</code>
                <CopyCode code={i.code} />
              </div>
              <div className="invitation-meta">
                <span>
                  Terpakai
                  <strong>
                    {i.used_count} / {i.max_uses}
                  </strong>
                </span>
                <span>
                  Berlaku sampai
                  <strong>
                    {i.expires_at
                      ? dateLabel(i.expires_at)
                      : "Tanpa batas waktu"}
                  </strong>
                </span>
              </div>
              <RevokeForm id={i.id} code={i.code} />
            </section>
          );
        })}
      </div>
      {!invites.length && (
        <section className="panel">
          <Empty title="Undang langkah belajar berikutnya">
            Buat kode pertama untuk membuka pendaftaran bagi guru dan siswa.
          </Empty>
        </section>
      )}
    </>
  );
}
