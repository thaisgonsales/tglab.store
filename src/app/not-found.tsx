import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="text-brand text-sm font-medium">Error 404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        No encontramos esta página
      </h1>
      <p className="text-foreground-muted mt-2 text-sm">
        Es posible que el enlace esté roto o que el producto ya no esté
        disponible.
      </p>
      <Link
        href="/"
        className="bg-brand text-brand-fg mt-6 rounded-md px-4 py-2 text-sm font-medium"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
