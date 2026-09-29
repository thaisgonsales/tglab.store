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
import { DiscoveryVideos } from "@/components/store/discovery-videos";
import { HeroBackground } from "@/components/store/hero-background";
import { ProductCard } from "@/components/store/product-card";
import { Button } from "@/components/ui/button";
import { publicEnv } from "@/lib/env";
import { formatDateLong } from "@/lib/datetime";
import {
  getBestSellers,
  listPublishedProducts,
  listStoreCategories,
  searchCatalog,
} from "@/server/services/catalog-service";
import { listHomeReviews } from "@/server/services/engagement-service";
import { getAllSettings } from "@/server/services/settings-service";

export default async function HomePage() {
  const { home, contact, brand } = await getAllSettings();
  const siteUrl = publicEnv.siteUrl;
  const sameAs = [contact.instagram, contact.facebook].filter(
    (value): value is string => Boolean(value),
  );
  const [featured, latest, bestSellers, offersResult, categories, reviews] =
    await Promise.all([
      listPublishedProducts({ featured: true, take: 8 }),
      listPublishedProducts({ take: 8 }),
      getBestSellers(8),
      searchCatalog({ onlyOffers: true, sort: "ofertas", perPage: 8 }),
      listStoreCategories(6),
      listHomeReviews(6),
    ]);
  const sectionData: Record<string, typeof latest> = {
    featured,
    new: latest,
    bestsellers: bestSellers,
    offers: offersResult.items,
  };
  const enabledSections = home.sections.filter(
    (section) =>
      section.enabled && (sectionData[section.type]?.length ?? 0) > 0,
  );
  const primarySection =
    enabledSections.find((section) => section.type === "featured") ??
    enabledSections[0];

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
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(25,24,27,.72)_0%,rgba(25,24,27,.42)_38%,rgba(25,24,27,.08)_68%,transparent_100%)]" />
        <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
          <div className="hero-content max-w-2xl text-white">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold tracking-[.16em] uppercase backdrop-blur-sm">
              <Sparkles className="size-4 text-[#f2a4bc]" /> Diseño que se
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
              <BadgeCheck className="size-4 text-[#f2a4bc]" />
              {home.heroTrustLine}
            </p>
          </div>
        </div>
      </section>

      <section
        data-reveal
        aria-label="Beneficios de comprar en TG LAB"
        className="border-border bg-surface border-b shadow-[0_10px_35px_rgba(41,39,45,.035)]"
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
              <div
                key={title}
                className="group flex items-center gap-3 px-3 py-3"
              >
                <span className="bg-brand/10 text-brand flex size-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-105">
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
        {primarySection && (
          <ProductSection
            title={primarySection.title}
            href={sectionHref(primarySection.type)}
            products={sectionData[primarySection.type] ?? []}
            tone="coral"
          />
        )}

        {categories.length > 0 && (
          <section data-reveal className="py-16 sm:py-20">
            <SectionHeading
              eyebrow="Encuentra tu estilo"
              title="Explora nuestras categorías"
              text="Piezas para organizar, decorar y darle un sello único a tus espacios."
              href="/categorias"
            />
            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
              {categories.map((category, index) => (
                <Link
                  key={category.id}
                  href={`/categoria/${category.slug}`}
                  data-reveal-item
                  data-reveal-kind={index % 2 === 0 ? "left" : "right"}
                  className="group relative isolate min-h-64 overflow-hidden rounded-[1.4rem] bg-[#ece5f6] shadow-[0_12px_35px_rgba(41,39,45,.08)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(108,74,182,.16)]"
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
                    <div
                      className={
                        [
                          "absolute inset-0 bg-[linear-gradient(145deg,#f6f1fb,#d9cbed)]",
                          "absolute inset-0 bg-[linear-gradient(145deg,#fff7f9,#efc3d0)]",
                          "absolute inset-0 bg-[linear-gradient(145deg,#f7f3fb,#eadff4)]",
                        ][index % 3]
                      }
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#29272d]/90 via-[#29272d]/15 to-transparent" />
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

        <DiscoveryVideos videos={home.discoveryVideos} />

        {enabledSections
          .filter((section) => section.key !== primarySection?.key)
          .map((section, index) => (
            <ProductSection
              key={section.key}
              title={section.title}
              href={sectionHref(section.type)}
              products={sectionData[section.type] ?? []}
              tone={(["lilac", "coral"] as const)[index % 2]}
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
          className="border-brand/15 relative my-16 overflow-hidden rounded-[1.75rem] border bg-[#fff5f7] px-6 py-12 text-[#29272d] shadow-[0_14px_40px_rgba(41,39,45,.06)] sm:px-12 sm:py-16"
        >
          <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
            <div>
              <p className="text-brand text-sm font-semibold tracking-[.14em] uppercase">
                Hecho a tu medida
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                {home.customCtaTitle}
              </h2>
              <p className="text-foreground-muted mt-4 max-w-2xl">
                {home.customCtaText}
              </p>
            </div>
            <Button asChild size="lg" className="bg-brand text-white">
              <Link href="/personalizados">
                {home.customCtaLabel}
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>

        {reviews.length > 0 && (
          <section data-reveal className="py-16">
            <SectionHeading
              eyebrow="Experiencias"
              title="Lo que dicen nuestros clientes"
              text="Experiencias de quienes ya eligieron TG LAB."
            />
            <div className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
              {reviews.map((review) => (
                <blockquote
                  key={review.id}
                  data-reveal-item
                  className="bg-surface hover:border-brand/25 w-[82vw] max-w-sm shrink-0 snap-center rounded-[1.25rem] border p-6 shadow-[0_10px_30px_rgba(41,39,45,.045)] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(41,39,45,.09)] md:w-auto md:max-w-none"
                >
                  <p
                    className="text-brand"
                    aria-label={`${review.rating} de 5 estrellas`}
                  >
                    {"★".repeat(review.rating)}
                    <span className="text-border">
                      {"★".repeat(5 - review.rating)}
                    </span>
                  </p>
                  {review.title && (
                    <h3 className="mt-3 font-semibold">{review.title}</h3>
                  )}
                  <p className="text-foreground-muted mt-2 text-sm leading-relaxed">
                    “{review.content}”
                  </p>
                  <footer className="mt-5 text-sm font-semibold">
                    {review.account.firstName ||
                      review.account.name.split(" ")[0]}
                    <span className="text-foreground-muted ml-2 font-normal">
                      Compra verificada
                    </span>
                    <Link
                      href={`/producto/${review.product.slug}`}
                      className="text-brand mt-1 block text-xs font-medium hover:underline"
                    >
                      {review.product.name}
                    </Link>
                    <time className="text-foreground-muted mt-1 block text-xs font-normal">
                      {formatDateLong(review.createdAt)}
                    </time>
                  </footer>
                </blockquote>
              ))}
            </div>
          </section>
        )}

        <section
          data-reveal
          className="border-brand/10 bg-surface my-16 rounded-[1.5rem] border p-6 shadow-[0_14px_40px_rgba(41,39,45,.05)] sm:p-9"
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
  tone,
}: {
  title: string;
  href: string;
  products: Awaited<ReturnType<typeof listPublishedProducts>>;
  tone: "lilac" | "coral" | undefined;
}) {
  return (
    <section
      data-reveal
      className={`relative py-16 section-${tone ?? "lilac"}`}
    >
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

function sectionHref(type: string) {
  if (type === "offers") return "/productos?orden=ofertas";
  if (type === "new") return "/productos?orden=nuevos";
  if (type === "bestsellers") return "/productos?orden=vendidos";
  return "/productos";
}
