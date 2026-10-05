import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
export function Table({ className, ...props }: ComponentProps<"table">) { return <table data-slot="table" className={cn("kodmod-table", className)} {...props} />; }
export function TableHeader(props: ComponentProps<"thead">) { return <thead data-slot="table-header" {...props} />; }
export function TableBody(props: ComponentProps<"tbody">) { return <tbody data-slot="table-body" {...props} />; }
export function TableRow(props: ComponentProps<"tr">) { return <tr data-slot="table-row" {...props} />; }
export function TableHead({ scope = "col", ...props }: ComponentProps<"th">) { return <th data-slot="table-head" scope={scope} {...props} />; }
export function TableCell(props: ComponentProps<"td">) { return <td data-slot="table-cell" {...props} />; }
