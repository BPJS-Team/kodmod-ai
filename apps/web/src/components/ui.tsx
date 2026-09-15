import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="KODMOD, halaman utama">
      <Image
        src="/brand/logo.png"
        alt="KODMOD"
        width={1564}
        height={452}
        priority
      />
    </Link>
  );
}
export function Heading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}
export function Badge({
  active,
  children,
}: {
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <span className={`badge ${active ? "badge-active" : ""}`}>{children}</span>
  );
}
