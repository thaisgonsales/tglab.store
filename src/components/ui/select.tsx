import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Select nativo con estilo consistente (suficiente para el panel). */
export function Select({
  className,
  children,
  ...props
}: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(
          "border-border bg-surface h-10 w-full appearance-none rounded-md border px-3 pr-9 text-sm",
          "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-[invalid=true]:border-red-500",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="text-foreground-muted pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
    </div>
  );
}
