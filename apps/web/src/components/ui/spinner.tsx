import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Spinner({ className, ...props }: ComponentProps<"span">) {
  return <span {...props} data-slot="spinner" className={cn("kodmod-spinner", className)} aria-hidden="true" />;
}
