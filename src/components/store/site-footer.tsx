import Link from "next/link";
import { FaWhatsapp } from "react-icons/fa";

import { BrandLogo } from "@/components/store/brand-logo";
import { FacebookIcon, InstagramIcon } from "@/components/icons/social";
import { buildWhatsappUrl } from "@/lib/whatsapp";

import { getAllSettings } from "@/server/services/settings-service";

const INFO_LINKS = [
  { label: "Preguntas frecuentes", href: "/preguntas-frecuentes" },
  { label: "Despachos", href: "/despachos" },
  { label: "Cambios y devoluciones", href: "/cambios-devoluciones" },
  { label: "Términos y condiciones", href: "/terminos" },
  { label: "Privacidad", href: "/privacidad" },
];

export async function SiteFooter() {
  const { brand, contact } = await getAllSettings();
  const year = new Date().getFullYear();

  return (
    <footer className="border-border relative mt-20 border-t bg-[#fff5f7]">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link
            href="/"
            aria-label={`Ir al inicio de ${brand.storeName}`}
            className="inline-block rounded-lg transition-transform duration-300 hover:-translate-y-0.5"
          >
            <BrandLogo name={brand.storeName} className="h-20" />
          </Link>
          <p className="text-foreground-muted mt-2 text-sm">{brand.tagline}</p>
          {contact.city && (
            <p className="text-foreground-muted mt-2 text-sm">{contact.city}</p>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold">Tienda</h2>
          <ul className="text-foreground-muted mt-3 space-y-2 text-sm">
            <li>
              <Link
                href="/productos"
                className="hover:text-brand transition-colors"
              >
                Productos
              </Link>
            </li>
            <li>
              <Link
                href="/categorias"
                className="hover:text-brand transition-colors"
              >
                Categorías
              </Link>
            </li>
            <li>
              <Link
                href="/personalizados"
                className="hover:text-brand transition-colors"
              >
                Personalizados
              </Link>
            </li>
            <li>
              <Link
                href="/pedido"
                className="hover:text-brand transition-colors"
              >
                Seguir mi pedido
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold">Información</h2>
          <ul className="text-foreground-muted mt-3 space-y-2 text-sm">
            {INFO_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="hover:text-brand transition-colors"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold">Contacto</h2>
          <ul className="text-foreground-muted mt-3 space-y-2 text-sm">
            {contact.email && <li>{contact.email}</li>}
            <li>
              <Link
                href="/cuenta"
                className="hover:text-brand transition-colors"
              >
                Mi cuenta
              </Link>
            </li>
          </ul>
          <div className="mt-3 flex gap-2">
            {contact.instagram && (
              <a
                href={contact.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="border-brand/20 text-brand hover:bg-brand flex size-9 items-center justify-center rounded-xl border bg-white/60 transition-[color,background-color,transform] hover:-translate-y-0.5 hover:text-white"
              >
                <InstagramIcon className="size-4" />
              </a>
            )}
            {contact.facebook && (
              <a
                href={contact.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="border-brand/20 text-brand hover:bg-brand flex size-9 items-center justify-center rounded-xl border bg-white/60 transition-[color,background-color,transform] hover:-translate-y-0.5 hover:text-white"
              >
                <FacebookIcon className="size-4" />
              </a>
            )}
            {contact.whatsapp && (
              <a
                href={buildWhatsappUrl(
                  contact.whatsapp,
                  "Hola, quisiera consultar por TG LAB.",
                )}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Escríbenos por WhatsApp"
                className="border-brand/20 text-brand hover:bg-brand flex size-9 items-center justify-center rounded-xl border bg-white/60 transition-[color,background-color,transform] hover:-translate-y-0.5 hover:text-white"
              >
                <FaWhatsapp
                  className="size-5 text-[#239b56]"
                  aria-hidden="true"
                />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="border-border border-t">
        <div className="text-foreground-muted mx-auto max-w-6xl px-4 py-4 text-xs">
          © {year} {brand.storeName}. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
