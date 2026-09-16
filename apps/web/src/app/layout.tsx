import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { RedirectFeedback } from "@/components/action-feedback";
import "../styles/index.css";
import "../styles/product.css";
import "sweetalert2/dist/sweetalert2.min.css";
import "../styles/experience.css";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/source-sans-3";
import SkipLink from "@/components/SkipLink";

export const metadata: Metadata = {
  title: "KODMOD - Asisten Belajar",
  description: "Asisten belajar AI untuk siswa tunanetra.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>
        <SkipLink />
        {children}
        <Suspense fallback={null}>
          <RedirectFeedback />
        </Suspense>
      </body>
    </html>
  );
}
