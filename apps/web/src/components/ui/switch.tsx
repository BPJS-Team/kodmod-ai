"use client";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import type { ComponentProps } from "react";

// shadcn/ui Switch structure with the KODMOD CSS tokens rather than generic
// utility colours. Radix supplies keyboard, role and checked semantics.
export function Switch({ className = "", ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return <SwitchPrimitive.Root data-slot="switch" className={`kodmod-switch ${className}`} {...props}>
    <SwitchPrimitive.Thumb data-slot="switch-thumb" className="kodmod-switch-thumb" />
  </SwitchPrimitive.Root>;
}
