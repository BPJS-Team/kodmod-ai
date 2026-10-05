"use client";
import { UiText } from "@/components/language-provider";

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <div className="panel empty" role="alert">
      <h1><UiText>{"Data belum dapat dimuat."}</UiText></h1>
      <p><UiText>{"Periksa koneksi layanan, lalu coba kembali. Perubahan yang belum dikirim tidak disimpan."}</UiText></p>
      <button className="button primary" onClick={reset}><UiText>{"Muat ulang data"}</UiText></button>
    </div>
  );
}
