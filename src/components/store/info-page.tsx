import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getInfoPage } from "@/server/services/pages-service";
import { getSettingsGroup } from "@/server/services/settings-service";
import { buildWhatsappUrl } from "@/lib/whatsapp";

export async function buildInfoMetadata(slug: string): Promise<Metadata> {
  const page = await getInfoPage(slug);
  if (!page) return {};
  return {
    title: page.seoTitle ?? page.title,
    description: page.seoDescription,
  };
}

export async function InfoPage({ slug }: { slug: string }) {
  const page = await getInfoPage(slug);
  if (!page) notFound();

  if (slug === "contacto") {
    const contact = await getSettingsGroup("contact");
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
        <div className="max-w-2xl">
          <p className="text-brand text-sm font-semibold tracking-widest uppercase">
            TG LAB
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Hablemos de tu idea
          </h1>
          <p className="text-foreground-muted mt-4 text-lg leading-relaxed">
            Estamos aquí para ayudarte a encontrar ese detalle especial o crear
            algo pensado para ti.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {contact.whatsapp ? (
            <a
              href={buildWhatsappUrl(contact.whatsapp, contact.whatsappMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-surface rounded-card border p-6 transition-shadow hover:shadow-md"
            >
              <p className="text-brand text-sm font-semibold">WhatsApp</p>
              <h2 className="mt-2 text-xl font-semibold">
                Escríbenos directamente
              </h2>
              <p className="text-foreground-muted mt-2 text-sm">
                Cuéntanos qué necesitas y te orientaremos personalmente.
              </p>
              <span className="text-brand mt-5 inline-block text-sm font-medium">
                {contact.phone} · Abrir conversación →
              </span>
            </a>
          ) : null}
          <div className="bg-surface rounded-card border p-6">
            <p className="text-brand text-sm font-semibold">Atención</p>
            <h2 className="mt-2 text-xl font-semibold">Compra con confianza</h2>
            <p className="text-foreground-muted mt-2 text-sm">
              Te ayudamos con productos, pedidos, despachos y personalizados.
            </p>
            {contact.city && (
              <p className="text-foreground-muted mt-5 text-sm">
                {contact.city}
              </p>
            )}
          </div>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="bg-surface rounded-card border p-6">
            <p className="text-brand text-sm font-semibold">
              Despachos y pedidos
            </p>
            <h2 className="mt-2 text-xl font-semibold">
              Te acompañamos en cada paso
            </h2>
            <p className="text-foreground-muted mt-2 text-sm">
              Consulta disponibilidad, opciones de entrega o el estado de una
              compra.
            </p>
          </div>
          <a
            href="/personalizados"
            className="bg-surface rounded-card border p-6 transition-shadow hover:shadow-md"
          >
            <p className="text-brand text-sm font-semibold">Personalizados</p>
            <h2 className="mt-2 text-xl font-semibold">
              Hagamos realidad tu idea
            </h2>
            <p className="text-foreground-muted mt-2 text-sm">
              Envíanos referencias y detalles para preparar una propuesta.
            </p>
            <span className="text-brand mt-5 inline-block text-sm font-medium">
              Solicitar personalizado →
            </span>
          </a>
        </div>
        <div className="border-border mt-10 border-t pt-8">
          <h2 className="text-xl font-semibold">
            También puedes escribirnos por correo
          </h2>
          <p className="text-foreground-muted mt-2 text-sm">
            {contact.email}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">{page.title}</h1>
      <div className="text-foreground-muted mt-6 space-y-4 text-sm leading-relaxed">
        {page.body.map((p, i) => (
          <p key={i}>
            <BoldText text={p} />
          </p>
        ))}
      </div>
    </div>
  );
}

function BoldText({ text }: { text: string }) {
  return text.split(/(\*\*.+?\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={index} className="text-foreground font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
}
