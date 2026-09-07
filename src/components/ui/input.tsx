import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "border-border bg-surface flex h-10 w-full rounded-md border px-3 py-2 text-sm",
        "placeholder:text-foreground-muted",
        "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-red-500",
        className,
      )}
      {...props}
    />
  );
}
