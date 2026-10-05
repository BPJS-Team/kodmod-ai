"use client";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
export const DropdownMenu = Dropdown.Root;
export const DropdownMenuTrigger = Dropdown.Trigger;
export const DropdownMenuItem = Dropdown.Item;
export const DropdownMenuLabel = Dropdown.Label;
export const DropdownMenuSeparator = Dropdown.Separator;
export function DropdownMenuContent({ className, sideOffset = 8, ...props }: ComponentProps<typeof Dropdown.Content>) {
  return <Dropdown.Portal><Dropdown.Content data-slot="dropdown-menu-content" className={cn("kodmod-dropdown-content", className)} sideOffset={sideOffset} {...props} /></Dropdown.Portal>;
}
