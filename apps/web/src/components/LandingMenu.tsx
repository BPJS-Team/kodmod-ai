"use client";

import { useRef } from "react";
import { Menu } from "lucide-react";

export default function LandingMenu({ links }: { links: string[][] }) {
  const menu = useRef<HTMLDetailsElement>(null);
  function close() {
    if (menu.current) menu.current.open = false;
  }
  return (
    <details
      ref={menu}
      className="lp-mobile-nav"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          close();
          menu.current?.querySelector("summary")?.focus();
        }
      }}
    >
      <summary aria-label="Buka navigasi">
        <Menu size={23} />
      </summary>
      <nav aria-label="Navigasi seluler">
        {links.map(([href, label]) => (
          <a href={href} key={href} onClick={close}>
            {label}
          </a>
        ))}
      </nav>
    </details>
  );
}
