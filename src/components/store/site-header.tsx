"use client";

import { Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";

export type NavItem = { label: string; href: string };

const NAV: NavItem[] = [
  { label: "Inicio", href: "/" },
  { label: "Productos", href: "/productos" },
  { label: "Categorías", href: "/categorias" },
  { label: "Personalizados", href: "/personalizados" },
  { label: "Nosotros", href: "/nosotros" },
  { label: "Contacto", href: "/contacto" },
];

export function SiteHeader({
  storeName,
  logoUrl,
  cartCount = 0,
  accountLabel,
  accountHref,
  announcement,
}: {
  storeName: string;
  logoUrl?: string;
  cartCount?: number;
  accountLabel: string;
  accountHref: string;
  announcement?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="border-border bg-background/90 sticky top-0 z-30 border-b shadow-[0_4px_24px_rgba(58,43,40,.04)] backdrop-blur-xl">
      {announcement && (
        <div className="border-brand/15 bg-[#fff1f3] px-4 py-2 text-center text-[11px] font-medium tracking-[.08em] text-[#8f3157] sm:text-xs">
          <p>{announcement}</p>
        </div>
      )}
      <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center gap-4 px-4">
        <button
          type="button"
          className="md:hidden"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>

        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={storeName} className="h-7 w-auto" />
          ) : (
            <span className="text-xl tracking-[-.04em]">
              <span className="text-brand">TG</span> LAB
            </span>
          )}
        </Link>

        <nav className="ml-4 hidden items-center gap-5 text-sm md:flex">
          {NAV.slice(1).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-foreground-muted hover:text-foreground transition-colors",
                pathname === item.href && "text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <Link
            href={accountHref}
            aria-label={accountLabel}
            className="hover:bg-surface-muted flex h-10 items-center justify-center gap-2 rounded-md px-2"
          >
            <UserRound className="size-5" />
            <span className="hidden text-sm lg:inline">{accountLabel}</span>
          </Link>
          <Link
            href="/productos"
            aria-label="Buscar productos"
            className="hover:bg-surface-muted flex size-10 items-center justify-center rounded-md"
          >
            <Search className="size-5" />
          </Link>
          <Link
            href="/carrito"
            aria-label="Ver carrito"
            className="hover:bg-surface-muted relative flex size-10 items-center justify-center rounded-md"
          >
            <ShoppingBag className="size-5" />
            {cartCount > 0 && (
              <span className="bg-brand text-brand-fg absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {open && (
        <nav className="border-border bg-background border-t md:hidden">
          <ul className="mx-auto max-w-6xl px-4 py-2">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block py-3 text-sm"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
