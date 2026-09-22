import Link from "next/link";

import { FacebookIcon, InstagramIcon } from "@/components/icons/social";
import { WhatsappIcon } from "@/components/icons/social";
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
    <footer className="border-border bg-surface mt-16 border-t">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-lg font-semibold">
            <span className="text-brand">TG</span> LAB
          </p>
          <p className="text-foreground-muted mt-2 text-sm">{brand.tagline}</p>
          {contact.city && (
            <p className="text-foreground-muted mt-2 text-sm">{contact.city}</p>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold">Tienda</h2>
          <ul className="text-foreground-muted mt-3 space-y-2 text-sm">
            <li>
              <Link href="/productos" className="hover:text-foreground">
                Productos
              </Link>
            </li>
            <li>
              <Link href="/categorias" className="hover:text-foreground">
                Categorías
              </Link>
            </li>
            <li>
              <Link href="/personalizados" className="hover:text-foreground">
                Personalizados
              </Link>
            </li>
            <li>
              <Link href="/pedido" className="hover:text-foreground">
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
                <Link href={l.href} className="hover:text-foreground">
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
              <Link href="/cuenta" className="hover:text-foreground">
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
                className="border-border hover:bg-surface-muted flex size-9 items-center justify-center rounded-md border"
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
                className="border-border hover:bg-surface-muted flex size-9 items-center justify-center rounded-md border"
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
                className="border-border hover:bg-surface-muted flex size-9 items-center justify-center rounded-md border"
              >
                <WhatsappIcon className="size-4" />
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
