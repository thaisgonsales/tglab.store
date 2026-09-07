import type { ReactNode } from "react";

export function PageShell({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {lead && <p className="text-foreground-muted mt-2">{lead}</p>}
      {children && (
        <div className="mt-8 space-y-4 text-sm leading-relaxed">{children}</div>
      )}
    </div>
  );
}

/** Aviso honesto de que una parte del sitio aún está en desarrollo. */
export function PhaseNotice({ area }: { area: string }) {
  return (
    <div className="rounded-card border-border bg-surface text-foreground-muted border border-dashed p-6 text-sm">
      {area} está en construcción. Esta sección se habilitará en una próxima
      etapa del desarrollo de TG LAB.
    </div>
  );
}
