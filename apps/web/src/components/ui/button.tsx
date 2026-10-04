import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// shadcn/ui composition and variants, using the existing KODMOD theme tokens.
const buttonVariants = cva("button", {
  variants: {
    variant: { default: "primary", outline: "secondary", destructive: "danger", ghost: "secondary" },
    size: { default: "", sm: "small", icon: "icon-button" },
  },
  defaultVariants: { variant: "default", size: "default" },
});
export function Button({ className, variant, size, asChild = false, ...props }:
  React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
export { buttonVariants };
