"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";

import { usePwaInstall } from "@/components/pwa-provider";
import { Button } from "@/components/ui/button";

export function AdminInstallButton() {
  const { canInstall, install } = usePwaInstall();

  if (!canInstall) return null;

  async function handleInstall() {
    const installed = await install();
    if (installed) toast.success("Panel instalado en este dispositivo");
  }

  return (
    <Button variant="outline" size="sm" onClick={handleInstall}>
      <Download className="size-4" />
      <span className="hidden sm:inline">Instalar panel</span>
      <span className="sm:hidden">Instalar</span>
    </Button>
  );
}
