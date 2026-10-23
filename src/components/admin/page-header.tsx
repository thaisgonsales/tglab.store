import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
  backHref,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  backHref?: string;
}) {
  return (
    <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row">
      <div className="min-w-0 break-words">
        {backHref && (
          <Link
            href={backHref}
            className="text-foreground-muted hover:text-foreground text-xs"
          >
            ← Volver
          </Link>
        )}
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-foreground-muted mt-1 text-sm">{description}</p>
        )}
      </div>
      {action && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}
