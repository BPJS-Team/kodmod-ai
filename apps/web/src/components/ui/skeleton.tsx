import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} data-slot="skeleton" className={cn("kodmod-skeleton", className)} aria-hidden="true" />;
}
