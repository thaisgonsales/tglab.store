import {
  ArrowRight,
  BadgeCheck,
  CreditCard,
  Headphones,
  HeartHandshake,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
  UserRoundCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { JsonLd } from "@/components/seo/json-ld";
import { HeroBackground } from "@/components/store/hero-background";
import { ProductCard } from "@/components/store/product-card";
import { Button } from "@/components/ui/button";
import { publicEnv } from "@/lib/env";
import {
  getBestSellers,
  listPublishedProducts,
  listStoreCategories,
  searchCatalog,
} from "@/server/services/catalog-service";
import { getAllSettings } from "@/server/services/settings-service";

export default async function HomePage() {
  const { home, contact, brand } = await getAllSettings();
  const siteUrl = publicEnv.siteUrl;
  const sameAs = [contact.instagram, contact.facebook].filter(
    (value): value is string => Boolean(value),
  );
  const [featured, latest, bestSellers, offersResult, categories] =
    await Promise.all([
      listPublishedProducts({ featured: true, take: 8 }),
      listPublishedProducts({ take: 8 }),
      getBestSellers(8),
      searchCatalog({ onlyOffers: true, sort: "ofertas", perPage: 8 }),
      listStoreCategories(6),
    ]);
  const sectionData: Record<string, typeof latest> = {
    featured,
    new: latest,
    bestsellers: bestSellers,
    offers: offersResult.items,
  };

  return (
    <div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: brand.storeName,
          description: brand.tagline,
          url: siteUrl,
          ...(brand.logoUrl ? { logo: `${siteUrl}${brand.logoUrl}` } : {}),
          ...(sameAs.length ? { sameAs } : {}),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: brand.storeName,
          url: siteUrl,
          inLanguage: "es-CL",
          potentialAction: {
            "@type": "SearchAction",
            target: `${siteUrl}/productos?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }}
      />

      <section className="relative isolate flex min-h-[610px] items-center overflow-hidden md:min-h-[720px]">
        <HeroBackground
          videoUrl={home.heroBackgroundVideoUrl}
          posterUrl={home.heroBackgroundPosterUrl}
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(42,29,25,.88)_0%,rgba(58,43,40,.66)_48%,rgba(58,43,40,.22)_100%)]" />
        <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
          <div className="hero-content max-w-2xl text-white">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold tracking-[.16em] uppercase backdrop-blur-sm">
              <Sparkles className="size-4 text-[#f6b58c]" /> Diseño que se
              siente tuyo
            </p>
            <h1 className="text-5xl leading-[.96] font-semibold tracking-[-.045em] text-balance sm:text-6xl md:text-7xl">
              {home.heroTitle}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/85 sm:text-xl">
              {home.heroSubtitle}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 px-7 shadow-lg">
                <Link href={home.heroPrimaryCtaHref}>
                  {home.heroPrimaryCtaLabel}
                  <ArrowRight />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 border-white/45 bg-white/10 px-7 text-white hover:bg-white/20"
              >
                <Link href={home.heroSecondaryCtaHref}>
                  {home.heroSecondaryCtaLabel}
                </Link>
              </Button>
            </div>
            <p className="mt-7 flex items-center gap-2 text-sm text-white/75">
              <BadgeCheck className="size-4 text-[#f6b58c]" />
              {home.heroTrustLine}
            </p>
          </div>
        </div>
      </section>

      <section
        data-reveal
        aria-label="Beneficios de comprar en TG LAB"
        className="border-border bg-surface border-b"
      >
        <div className="mx-auto grid max-w-6xl grid-cols-2 px-4 py-5 md:grid-cols-4">
          {home.benefits.map(({ title, text }, index) => {
            const Icon =
              (
                [
                  Sparkles,
                  ShieldCheck,
                  Truck,
                  HeartHandshake,
                ] satisfies LucideIcon[]
              )[index] ?? Sparkles;
            return (
              <div key={title} className="flex items-center gap-3 px-3 py-3">
                <span className="bg-brand/10 text-brand flex size-10 shrink-0 items-center justify-center rounded-full">
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-foreground-muted mt-0.5 text-xs">{text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        {categories.length > 0 && (
          <section data-reveal className="py-16 sm:py-20">
            <SectionHeading
              eyebrow="Encuentra tu estilo"
              title="Explora nuestras categorías"
              text="Piezas para organizar, decorar y darle un sello único a tus espacios."
              href="/categorias"
            />
            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/categoria/${category.slug}`}
                  data-reveal-item
                  className="group relative isolate min-h-64 overflow-hidden rounded-[1.25rem] bg-[#e3d3bc] shadow-[0_12px_35px_rgba(58,43,40,.08)]"
                >
                  {category.imageUrl ? (
                    <Image
                      src={category.imageUrl}
                      alt={category.name}
                      fill
                      sizes="(max-width: 768px) 50vw, 17vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(239,157,104,.55),transparent_42%),linear-gradient(145deg,#eadbc5,#cfaec0)]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2f211e]/90 via-[#2f211e]/15 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <h3 className="font-semibold">{category.name}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-white/75">
                      {category.description ||
                        "Descubre piezas para hacer tu espacio más tuyo."}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {home.sections
          .filter(
            (section) =>
              section.enabled && (sectionData[section.type]?.length ?? 0) > 0,
          )
          .map((section) => (
            <ProductSection
              key={section.key}
              title={section.title}
              href={
                section.type === "offers"
                  ? "/productos?orden=ofertas"
                  : section.type === "new"
                    ? "/productos?orden=nuevos"
                    : section.type === "bestsellers"
                      ? "/productos?orden=vendidos"
                      : "/productos"
              }
              products={sectionData[section.type] ?? []}
            />
          ))}

        {featured.length === 0 && latest.length === 0 && (
          <section
            data-reveal
            className="my-16 rounded-[1.5rem] border border-dashed p-12 text-center"
          >
            <ShoppingBag className="text-brand mx-auto size-8" />
            <h2 className="mt-4 text-xl font-semibold">
              Muy pronto encontrarás algo especial
            </h2>
            <p className="text-foreground-muted mx-auto mt-2 max-w-md text-sm">
              Estamos dando los últimos detalles a nuestra colección. También
              podemos crear una pieza especialmente para ti.
            </p>
            <Button asChild className="mt-6">
              <Link href="/personalizados">Cuéntanos tu idea</Link>
            </Button>
          </section>
        )}

        <section
          data-reveal
          className="my-16 overflow-hidden rounded-[1.75rem] bg-[#3a2b28] px-6 py-12 text-white sm:px-12 sm:py-16"
        >
          <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-semibold tracking-[.14em] text-[#ef9d68] uppercase">
                Hecho a tu medida
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                {home.customCtaTitle}
              </h2>
              <p className="mt-4 max-w-2xl text-white/70">
                {home.customCtaText}
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="bg-[#ef9d68] text-[#3a2b28] hover:opacity-90"
            >
              <Link href="/personalizados">
                {home.customCtaLabel}
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>

        {home.testimonials.length > 0 && (
          <section data-reveal className="py-16">
            <SectionHeading
              eyebrow="Experiencias"
              title="Lo que dicen nuestros clientes"
              text="Historias reales de personas que eligieron TG LAB."
            />
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {home.testimonials.map((item) => (
                <blockquote
                  key={`${item.name}-${item.quote}`}
                  className="bg-surface rounded-[1.25rem] border p-6"
                >
                  <p className="text-lg leading-relaxed">“{item.quote}”</p>
                  <footer className="mt-5 text-sm font-semibold">
                    {item.name}
                    {item.detail && (
                      <span className="text-foreground-muted ml-2 font-normal">
                        {item.detail}
                      </span>
                    )}
                  </footer>
                </blockquote>
              ))}
            </div>
          </section>
        )}

        <section
          data-reveal
          className="border-border bg-surface my-16 rounded-[1.5rem] border p-6 sm:p-9"
        >
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {(
              [
                [
                  CreditCard,
                  "Pago seguro",
                  "Medios habilitados y total transparente",
                ],
                [PackageCheck, "Seguimiento", "Revisa el avance de tu pedido"],
                [Headphones, "Atención cercana", "Conversemos por WhatsApp"],
                [
                  ShieldCheck,
                  "Cambios y devoluciones",
                  "Información clara antes de comprar",
                ],
                [
                  UserRoundCheck,
                  "Compra a tu manera",
                  "Como invitado o con tu cuenta",
                ],
              ] satisfies Array<[LucideIcon, string, string]>
            ).map(([Icon, title, text]) => (
              <div key={String(title)}>
                <Icon className="text-brand size-6" />
                <h3 className="mt-3 text-sm font-semibold">{String(title)}</h3>
                <p className="text-foreground-muted mt-1 text-xs leading-relaxed">
                  {String(text)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  text,
  href,
}: {
  eyebrow: string;
  title: string;
  text: string;
  href?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-6">
      <div>
        <p className="text-brand text-xs font-semibold tracking-[.16em] uppercase">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h2>
        <p className="text-foreground-muted mt-3 max-w-xl">{text}</p>
      </div>
      {href && (
        <Link
          href={href}
          className="text-brand hidden shrink-0 items-center gap-1 text-sm font-semibold sm:flex"
        >
          Ver todo <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}

function ProductSection({
  title,
  href,
  products,
}: {
  title: string;
  href: string;
  products: Awaited<ReturnType<typeof listPublishedProducts>>;
}) {
  return (
    <section data-reveal className="py-14">
      <SectionHeading
        eyebrow="Selección TG LAB"
        title={title}
        text="Diseños elegidos para transformar los pequeños momentos y rincones de tu día."
        href={href}
      />
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
