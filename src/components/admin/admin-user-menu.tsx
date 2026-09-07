"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function AdminUserMenu({
  name,
  email,
  role,
}: {
  name: string;
  email: string;
  role: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    const { error } = await authClient.signOut();
    if (error) {
      toast.error("No se pudo cerrar sesión");
      setLoading(false);
      return;
    }
    router.replace("/admin/login");
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-sm leading-tight font-medium">{name}</p>
        <p className="text-foreground-muted text-xs">
          {email} · {role}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSignOut}
        disabled={loading}
      >
        <LogOut className="size-4" />
        Salir
      </Button>
    </div>
  );
}
