import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
// Native options retain platform keyboard and assistive technology behavior.
export function NativeSelect({ className, ...props }: ComponentProps<"select">) {
  return <select data-slot="select" className={cn("kodmod-select", className)} {...props} />;
}
