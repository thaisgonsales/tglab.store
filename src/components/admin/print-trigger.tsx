"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/** Abre el diálogo de impresión al cargar la vista de impresión del pedido. */
export function PrintTrigger() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="mb-4 print:hidden">
      <Button size="sm" variant="outline" onClick={() => window.print()}>
        Imprimir
      </Button>
    </div>
  );
}
