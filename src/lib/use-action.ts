"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import type { ActionResult } from "@/server/auth/action-guard";

type Options<T> = {
  onSuccess?: (data: T) => void;
  successMessage?: string;
};

/**
 * Ejecuta una Server Action que devuelve `ActionResult`, mostrando toasts de
 * error/éxito y exponiendo un estado `pending`.
 */
export function useAction<TArgs extends unknown[], TData>(
  action: (...args: TArgs) => Promise<ActionResult<TData>>,
  options: Options<TData> = {},
) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(...args: TArgs): Promise<ActionResult<TData>> {
    return new Promise((resolve) => {
      startTransition(async () => {
        setError(null);
        const result = await action(...args);
        if (result.ok) {
          if (options.successMessage) toast.success(options.successMessage);
          options.onSuccess?.(result.data);
        } else {
          setError(result.error);
          toast.error(result.error);
        }
        resolve(result);
      });
    });
  }

  return { run, isPending, error };
}
