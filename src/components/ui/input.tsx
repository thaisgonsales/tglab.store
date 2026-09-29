import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "border-border bg-surface flex h-10 w-full rounded-xl border px-3 py-2 text-sm shadow-[0_2px_8px_rgba(41,39,45,.025)] transition-[border-color,box-shadow,background-color] duration-200",
        "placeholder:text-foreground-muted",
        "focus-visible:border-brand/60 focus-visible:shadow-[0_0_0_3px_rgba(217,92,130,.1)] focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-red-500",
        className,
      )}
      {...props}
    />
  );
}
