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
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
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
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
