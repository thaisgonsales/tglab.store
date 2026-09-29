import type { Metadata } from "next";
import { CheckCircle2, MessageCircle, Send, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { CustomRequestForm } from "@/components/store/custom-request-form";
import { ProductCard } from "@/components/store/product-card";
import { listCustomizableProducts } from "@/server/services/catalog-service";
import { getSettingsGroup } from "@/server/services/settings-service";

export const metadata: Metadata = {
  title: "Productos personalizados",
  description:
    "Cuéntanos tu idea y la transformamos en un producto único para ti. Enviar la solicitud no constituye una compra.",
};

export default async function CustomRequestsPage() {
  const [home, products] = await Promise.all([
    getSettingsGroup("home"),
    listCustomizableProducts(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-brand text-sm font-semibold tracking-[.16em] uppercase">
          Diseñado contigo
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          {home.customCtaTitle}
        </h1>
        <p className="text-foreground-muted mx-auto mt-4 max-w-2xl text-lg">
          {home.customCtaText}
        </p>
      </div>

      <section className="mt-12" aria-labelledby="custom-models-title">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-brand text-sm font-semibold tracking-[.14em] uppercase">
              Elige una base
            </p>
            <h2
              id="custom-models-title"
              className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              Modelos que puedes personalizar
            </h2>
            <p className="text-foreground-muted mt-2 max-w-2xl text-sm sm:text-base">
              Abre un modelo y configura únicamente las opciones disponibles
              para ese producto. Verás el precio final antes de agregarlo.
            </p>
          </div>
        </div>

        {products.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="border-brand/20 mt-6 rounded-[1.25rem] border border-dashed bg-white/55 p-6 text-center">
            <p className="font-medium">
              Pronto publicaremos modelos configurables.
            </p>
            <p className="text-foreground-muted mt-1 text-sm">
              Mientras tanto, puedes enviarnos tu idea en el formulario de
              abajo.
            </p>
          </div>
        )}
      </section>

      <section
        className="mt-16 border-t pt-12"
        aria-labelledby="custom-idea-title"
      >
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-brand text-sm font-semibold tracking-[.14em] uppercase">
            Proyecto especial
          </p>
          <h2
            id="custom-idea-title"
            className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            ¿Tienes otra idea?
          </h2>
          <p className="text-foreground-muted mt-2">
            Si ningún modelo te sirve, envíanos una solicitud libre y te
            responderemos con una propuesta antes de fabricar.
          </p>
        </div>

        <div className="my-12 grid gap-4 md:grid-cols-3">
          {(
            [
              [
                MessageCircle,
                "1. Cuéntanos tu idea",
                "Comparte medidas, colores, cantidad y referencias.",
              ],
              [
                Sparkles,
                "2. Revisamos los detalles",
                "Evaluamos contigo las opciones y resolvemos tus dudas.",
              ],
              [
                Send,
                "3. Recibe una propuesta",
                "Te enviaremos una cotización para que decidas con calma.",
              ],
            ] satisfies Array<[LucideIcon, string, string]>
          ).map(([Icon, title, text]) => (
            <div
              key={title}
              className="bg-surface rounded-[1.25rem] border p-6"
            >
              <Icon className="text-brand size-7" />
              <h2 className="mt-4 font-semibold">{title}</h2>
              <p className="text-foreground-muted mt-2 text-sm leading-relaxed">
                {text}
              </p>
            </div>
          ))}
        </div>

        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[.75fr_1.25fr]">
          <aside className="rounded-[1.5rem] bg-[#3a2b28] p-7 text-white">
            <h2 className="text-2xl font-semibold">
              Una pieza tan única como tu idea
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              Cuéntanos lo que imaginas. Revisaremos la factibilidad, tiempos y
              valor antes de comenzar.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-white/85">
              {[
                "Orientación personalizada",
                "Propuesta sin compromiso",
                "Confirmación antes de fabricar",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-[#ef9d68]" />
                  {item}
                </li>
              ))}
            </ul>
          </aside>
          <div>
            <CustomRequestForm />
          </div>
        </div>
      </section>
    </div>
  );
}
