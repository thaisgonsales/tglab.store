"use client";

import { Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { BrandLogo } from "@/components/store/brand-logo";
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
  cartCount = 0,
  accountLabel,
  accountHref,
  announcement,
}: {
  storeName: string;
  cartCount?: number;
  accountLabel: string;
  accountHref: string;
  announcement?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="border-border/80 bg-background/88 sticky top-0 z-30 border-b shadow-[0_8px_30px_rgba(41,39,45,.055)] backdrop-blur-xl">
      {announcement && (
        <div className="bg-brand overflow-hidden px-4 py-2 text-center text-[11px] font-semibold tracking-[.08em] text-white sm:text-xs">
          <p className="announcement-message">
            <span
              className="announcement-sparkle mr-2 inline-block"
              aria-hidden="true"
            >
              ✦
            </span>
            {announcement}
          </p>
        </div>
      )}
      <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center gap-2 px-4 sm:h-20 sm:gap-4">
        <button
          type="button"
          className="hover:bg-surface-muted flex size-10 items-center justify-center rounded-xl transition-colors md:hidden"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>

        <Link
          href="/"
          aria-label={`Ir al inicio de ${storeName}`}
          className="rounded-lg transition-transform duration-300 hover:-translate-y-0.5"
        >
          <BrandLogo name={storeName} className="h-11 sm:h-16" eager />
        </Link>

        <nav className="border-border/60 ml-4 hidden items-center gap-5 rounded-full border bg-white/55 px-5 text-sm shadow-[0_5px_18px_rgba(41,39,45,.035)] md:flex">
          {NAV.slice(1).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "after:bg-brand text-foreground-muted hover:text-brand relative py-2 transition-colors after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:transition-transform after:duration-200 hover:after:scale-x-100",
                pathname === item.href && "text-brand after:scale-x-100",
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
            className="hover:bg-surface-muted hover:text-brand flex h-10 items-center justify-center gap-2 rounded-xl px-2 transition-[color,background-color,transform] hover:-translate-y-0.5"
          >
            <UserRound className="size-5" />
            <span className="hidden text-sm lg:inline">{accountLabel}</span>
          </Link>
          <Link
            href="/productos"
            aria-label="Buscar productos"
            className="hover:bg-surface-muted hover:text-brand flex size-10 items-center justify-center rounded-xl transition-[color,background-color,transform] hover:-translate-y-0.5"
          >
            <Search className="size-5" />
          </Link>
          <Link
            href="/carrito"
            aria-label="Ver carrito"
            className="hover:bg-surface-muted hover:text-brand relative flex size-10 items-center justify-center rounded-xl transition-[color,background-color,transform] hover:-translate-y-0.5"
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
        <nav className="border-border bg-surface animate-in border-t shadow-xl md:hidden">
          <ul className="mx-auto max-w-6xl px-4 py-3">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "hover:bg-surface-muted hover:text-brand block rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                    pathname === item.href && "bg-surface-muted text-brand",
                  )}
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
