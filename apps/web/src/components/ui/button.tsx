import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

// shadcn/ui composition and variants, using the existing KODMOD theme tokens.
const buttonVariants = cva("button", {
  variants: {
    variant: { default: "primary", outline: "secondary", destructive: "danger", ghost: "secondary" },
    size: { default: "", sm: "small", icon: "icon-button" },
  },
  defaultVariants: { variant: "default", size: "default" },
});
export function Button({ className, variant, size, asChild = false, loading = false, loadingText, disabled, children, ...props }:
  React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & (
    { asChild?: false; loading?: boolean; loadingText?: React.ReactNode } |
    { asChild: true; loading?: never; loadingText?: never }
  )) {
  const Comp = asChild ? Slot : "button";
  return <Comp {...props} data-slot="button" className={cn(buttonVariants({ variant, size, className }))}
    disabled={disabled || loading} aria-busy={loading || props["aria-busy"]}>
    {asChild ? children : <>{loading && <Spinner />}{loading && loadingText ? loadingText : children}</>}
  </Comp>;
}
export { buttonVariants };
