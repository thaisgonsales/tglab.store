"use client";

import {
  LayoutDashboard,
  Package,
  FolderTree,
  SlidersHorizontal,
  ShoppingCart,
  Users,
  Ticket,
  Truck,
  Sparkles,
  FileText,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Productos", href: "/admin/productos", icon: Package },
  { label: "Categorías", href: "/admin/categorias", icon: FolderTree },
  { label: "Atributos", href: "/admin/atributos", icon: SlidersHorizontal },
  { label: "Pedidos", href: "/admin/pedidos", icon: ShoppingCart },
  { label: "Clientes", href: "/admin/clientes", icon: Users },
  { label: "Cupones", href: "/admin/cupones", icon: Ticket },
  { label: "Despachos", href: "/admin/despachos", icon: Truck },
  { label: "Personalizados", href: "/admin/personalizados", icon: Sparkles },
  { label: "Páginas", href: "/admin/paginas", icon: FileText },
  { label: "Configuración", href: "/admin/configuracion", icon: Settings },
];

export function AdminSidebar({ owner, labels }: { owner: boolean; labels: { security: string; team: string } }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5 p-3">
      {[...NAV, { label: labels.security, href: "/admin/seguridad", icon: Settings }, ...(owner ? [{ label: labels.team, href: "/admin/equipo", icon: Users }] : [])].map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-brand text-brand-fg"
                : "text-foreground-muted hover:bg-surface-muted hover:text-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
