"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="text-brand text-sm font-medium">Error 500</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        Algo salió mal
      </h1>
      <p className="text-foreground-muted mt-2 text-sm">
        Ocurrió un problema al procesar tu solicitud. Puedes intentar
        nuevamente.
      </p>
      <button
        type="button"
        onClick={reset}
        className="bg-brand text-brand-fg mt-6 rounded-md px-4 py-2 text-sm font-medium"
      >
        Reintentar
      </button>
    </div>
  );
}
