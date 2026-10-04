import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { UiText } from "@/components/language-provider";
import { Badge, Empty, Heading } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/session";
import { backend } from "@/lib/server-api";
import type { AdminMaterialCatalog } from "@/lib/admin-material-types";
import "@/styles/admin-materials.css";

export default async function Page({ searchParams }: { searchParams: Promise<{ search?: string; page?: string }> }) {
  const { token } = await requireSession("admin");
  const query = await searchParams;
  const search = (query.search ?? "").slice(0, 120);
  const raw = Number(query.page ?? 0);
  const page = Number.isSafeInteger(raw) && raw >= 0 ? Math.min(raw, 10000) : 0;
  const catalog = await backend<AdminMaterialCatalog>(`/admin/materials?limit=25&offset=${page * 25}&search=${encodeURIComponent(search)}`, token);
  const href = (value: number) => `/admin/materi?page=${value}&search=${encodeURIComponent(search)}`;
  return <>
    <Heading title={<UiText>{"Materi kelas"}</UiText>} description={<UiText>{"Lihat materi guru, tinjau isi, dan kelola kesiapan belajar siswa."}</UiText>} />
    <form className="panel admin-material-search" action="/admin/materi"><label className="field"><UiText>{"Cari judul materi"}</UiText><input name="search" defaultValue={search} maxLength={120} type="search" /></label><Button type="submit"><UiText>{"Cari"}</UiText></Button><span>{catalog.total} <UiText>{"materi"}</UiText></span></form>
    {catalog.items.length ? <div className="admin-material-grid">{catalog.items.map((material) => <article className="panel admin-material-card" key={material.id}>
      <header><BookOpen size={22} aria-hidden="true" /><Badge active={material.published}>{material.published ? <UiText>{"Terbit"}</UiText> : <UiText>{"Draft"}</UiText>}</Badge></header>
      <h2>{material.title}</h2><p>{material.subject} · {material.class_name}</p><small>{material.teacher_name}</small>
      <div className="admin-material-status"><UiText>{material.rag_status === "ready" && material.indexed_version === material.content_version ? "Siap untuk Tutor" : material.rag_status === "failed" ? "Perlu diproses ulang" : material.published ? "Sedang disiapkan" : "Belum diterbitkan"}</UiText></div>
      <Link href={`/admin/materi/${material.id}`}><UiText>{"Tinjau materi"}</UiText><ArrowRight size={17} aria-hidden="true" /></Link>
    </article>)}</div> : <section className="panel"><Empty title={<UiText>{"Belum ada materi"}</UiText>}><UiText>{"Materi yang diunggah guru akan muncul di sini. Coba ubah pencarian jika materi belum ditemukan."}</UiText></Empty></section>}
    <nav className="admin-material-pagination" aria-label="Halaman materi">{page > 0 && <Button variant="outline" asChild><Link href={href(page - 1)}><UiText>{"Sebelumnya"}</UiText></Link></Button>}{(page + 1) * 25 < catalog.total && <Button variant="outline" asChild><Link href={href(page + 1)}><UiText>{"Berikutnya"}</UiText></Link></Button>}</nav>
  </>;
}
