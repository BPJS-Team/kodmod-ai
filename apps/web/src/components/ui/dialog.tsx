import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
// Native dialog provides modal focus, inert background and Escape semantics.
export function Dialog({ className, ...props }: ComponentProps<"dialog">) {
  return <dialog data-slot="dialog" className={cn("kodmod-dialog", className)} {...props} />;
}
