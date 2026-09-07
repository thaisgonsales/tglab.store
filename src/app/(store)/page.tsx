import { ArrowRight, Package, Sparkles, Truck } from "lucide-react";
import Link from "next/link";

import { JsonLd } from "@/components/seo/json-ld";
import { ProductCard } from "@/components/store/product-card";
import { Button } from "@/components/ui/button";
import { publicEnv } from "@/lib/env";
import {
  getBestSellers,
  listPublishedProducts,
  searchCatalog,
} from "@/server/services/catalog-service";
import { getAllSettings } from "@/server/services/settings-service";

export default async function HomePage() {
  const { home, contact, brand } = await getAllSettings();

  const siteUrl = publicEnv.siteUrl;
  const sameAs = [
    contact.instagram &&
      `https://instagram.com/${contact.instagram.replace(/^@/, "")}`,
    contact.facebook &&
      (contact.facebook.startsWith("http")
        ? contact.facebook
        : `https://facebook.com/${contact.facebook}`),
  ].filter((v): v is string => Boolean(v));

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brand.storeName,
    description: brand.tagline,
    url: siteUrl,
    ...(brand.logoUrl ? { logo: `${siteUrl}${brand.logoUrl}` } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
    ...(contact.email || contact.whatsapp
      ? {
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer support",
            ...(contact.email ? { email: contact.email } : {}),
            ...(contact.whatsapp ? { telephone: `+${contact.whatsapp}` } : {}),
            areaServed: "CL",
            availableLanguage: "es",
          },
        }
      : {}),
  };

  const websiteJsonLd = {
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
  };
  const [featured, latest, bestSellers, offersResult] = await Promise.all([
    listPublishedProducts({ featured: true, take: 8 }),
    listPublishedProducts({ take: 8 }),
    getBestSellers(8),
    searchCatalog({ onlyOffers: true, sort: "ofertas", perPage: 8 }),
  ]);
  const offers = offersResult.items;

  const sectionData: Record<string, typeof latest> = {
    featured,
    new: latest,
    bestsellers: bestSellers,
    offers,
  };

  return (
    <div className="mx-auto max-w-6xl px-4">
      <JsonLd data={organizationJsonLd} />
      <JsonLd data={websiteJsonLd} />

      {/* HERO */}
      <section className="grid gap-6 py-12 md:grid-cols-2 md:items-center md:py-20">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {home.heroTitle}
          </h1>
          <p className="text-foreground-muted mt-4 max-w-prose">
            {home.heroSubtitle}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href={home.heroPrimaryCtaHref}>
                {home.heroPrimaryCtaLabel}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={home.heroSecondaryCtaHref}>
                {home.heroSecondaryCtaLabel}
              </Link>
            </Button>
          </div>
        </div>
        <div className="rounded-card border-border bg-surface-muted aspect-[4/3] border" />
      </section>

      {/* BENEFICIOS */}
      <section className="border-border grid gap-4 border-y py-8 sm:grid-cols-3">
        {[
          {
            icon: Package,
            title: "Fabricación propia",
            text: "Impresión 3D en Chiloé",
          },
          {
            icon: Truck,
            title: "Despacho a todo Chile",
            text: "y retiro coordinado",
          },
          {
            icon: Sparkles,
            title: "Personalizados",
            text: "hechos a tu medida",
          },
        ].map((b) => (
          <div key={b.title} className="flex items-start gap-3">
            <b.icon className="text-brand mt-0.5 size-5" />
            <div>
              <p className="text-sm font-medium">{b.title}</p>
              <p className="text-foreground-muted text-sm">{b.text}</p>
            </div>
          </div>
        ))}
      </section>

      {home.sections
        .filter((s) => s.enabled && (sectionData[s.type]?.length ?? 0) > 0)
        .map((s) => (
          <ProductSection
            key={s.key}
            title={s.title}
            href={
              s.type === "offers"
                ? "/productos?orden=ofertas"
                : s.type === "new"
                  ? "/productos?orden=nuevos"
                  : "/productos"
            }
            products={sectionData[s.type] ?? []}
          />
        ))}

      {featured.length === 0 && latest.length === 0 && (
        <section className="py-16 text-center">
          <p className="text-foreground-muted">
            Estamos preparando el catálogo. Vuelve pronto.
          </p>
        </section>
      )}

      {/* CTA PERSONALIZADOS */}
      <section className="rounded-card border-border bg-surface my-12 border p-8 text-center">
        <h2 className="text-xl font-semibold">{home.customCtaTitle}</h2>
        <p className="text-foreground-muted mx-auto mt-2 max-w-prose">
          {home.customCtaText}
        </p>
        <Button asChild className="mt-5">
          <Link href="/personalizados">
            {home.customCtaLabel}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>

      {contact.city && (
        <p className="text-foreground-muted pb-12 text-center text-sm">
          TG LAB · {contact.city}
        </p>
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
    <section className="py-10">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        <Link href={href} className="text-brand text-sm hover:underline">
          Ver todo
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
