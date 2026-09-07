export function AdminPagePlaceholder({
  title,
  phase,
  description,
}: {
  title: string;
  phase: string;
  description?: string;
}) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      {description && (
        <p className="text-foreground-muted text-sm">{description}</p>
      )}
      <div className="rounded-card border-border bg-surface text-foreground-muted border border-dashed p-6 text-sm">
        Esta sección se implementa en la <strong>{phase}</strong>. La
        estructura, el modelo de datos y la navegación ya están listos.
      </div>
    </div>
  );
}
