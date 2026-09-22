import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/seo/json-ld";
import { RefreshCw, ShieldCheck, Truck } from "lucide-react";
import { ProductCard } from "@/components/store/product-card";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductPurchase } from "@/components/store/product-purchase";
import { WhatsappProductButton } from "@/components/store/whatsapp-product-button";
import { FavoriteButton } from "@/components/store/favorite-button";
import {
  DEFAULT_LAST_UNITS_THRESHOLD,
  DEFAULT_LOW_STOCK_THRESHOLD,
} from "@/config/constants";
import { publicEnv } from "@/lib/env";
import { formatCLP } from "@/lib/money";
import { summarizePrice } from "@/lib/product-price";
import {
  getPublishedProductBySlug,
  getRelatedProducts,
} from "@/server/services/catalog-service";
import { getSettingsGroup } from "@/server/services/settings-service";
import { getCustomerSession } from "@/server/auth/customer-session";
import {
  isProductFavorite,
  listPublishedReviews,
} from "@/server/services/engagement-service";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublishedProductBySlug(slug);
  if (!product) return { title: "Producto no encontrado" };
  const image = product.media.find((m) => m.type === "IMAGE")?.url;
  const ogImage =
    image ??
    `/api/og?title=${encodeURIComponent(product.name)}${
      product.shortDescription
        ? `&subtitle=${encodeURIComponent(product.shortDescription)}`
        : ""
    }`;
  return {
    title: product.seoTitle ?? product.name,
    description:
      product.seoDescription ?? product.shortDescription ?? undefined,
    alternates: { canonical: `/producto/${product.slug}` },
    openGraph: {
      title: product.seoTitle ?? product.name,
      description: product.shortDescription ?? undefined,
      images: [{ url: ogImage }],
      type: "website",
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const product = await getPublishedProductBySlug(slug);
  if (!product) notFound();

  const [commerce, contact, session, reviewData] = await Promise.all([
    getSettingsGroup("commerce"),
    getSettingsGroup("contact"),
    getCustomerSession(),
    listPublishedReviews(product.id),
  ]);
  const favorite = session
    ? await isProductFavorite(session.user.id, product.id)
    : false;

  const priceSummary = summarizePrice(product.variants);
  const categoryIds = product.categories.map((c) => c.categoryId);
  const related = await getRelatedProducts(product.id, categoryIds, 4);

  const primaryCategory =
    product.categories.find((c) => c.isPrimary)?.category ??
    product.categories[0]?.category;

  const attributes = product.attributes.map((pa) => ({
    id: pa.attributeId,
    name: pa.attribute.name,
    type: pa.attribute.type,
    values: pa.attribute.values.map((v) => ({
      id: v.id,
      label: v.label,
      hex: v.hex,
    })),
  }));

  const variants = product.variants.map((v) => ({
    id: v.id,
    price: v.price,
    compareAtPrice: v.compareAtPrice,
    stock: v.stock,
    sku: v.sku,
    options: Object.fromEntries(
      v.attributeValues.map((av) => [av.attributeId, av.attributeValueId]),
    ),
  }));

  const description =
    product.description &&
    typeof product.description === "object" &&
    "text" in product.description
      ? String((product.description as { text: unknown }).text)
      : "";

  const productUrl = `${publicEnv.siteUrl}/producto/${product.slug}`;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { name: "Inicio", item: publicEnv.siteUrl },
      { name: "Productos", item: `${publicEnv.siteUrl}/productos` },
      ...(primaryCategory
        ? [
            {
              name: primaryCategory.name,
              item: `${publicEnv.siteUrl}/categoria/${primaryCategory.slug}`,
            },
          ]
        : []),
      { name: product.name, item: productUrl },
    ].map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      item: entry.item,
    })),
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription ?? undefined,
    image: product.media
      .filter((m) => m.type === "IMAGE")
      .map((m) => `${publicEnv.siteUrl}${m.url}`),
    sku: product.sku ?? undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "CLP",
      price: priceSummary.from,
      availability: priceSummary.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: productUrl,
    },
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      <nav className="text-foreground-muted mb-4 text-xs" aria-label="Ruta">
        <Link href="/" className="hover:text-foreground">
          Inicio
        </Link>{" "}
        /{" "}
        <Link href="/productos" className="hover:text-foreground">
          Productos
        </Link>
        {primaryCategory && (
          <>
            {" "}
            /{" "}
            <Link
              href={`/categoria/${primaryCategory.slug}`}
              className="hover:text-foreground"
            >
              {primaryCategory.name}
            </Link>
          </>
        )}{" "}
        / <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <ProductGallery
          productName={product.name}
          media={product.media.map((m) => ({
            id: m.id,
            type: m.type,
            provider: m.provider,
            url: m.url,
            posterUrl: m.posterUrl,
            alt: m.alt,
            blurDataUrl: m.blurDataUrl,
          }))}
        />

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {product.name}
          </h1>
          {product.shortDescription && (
            <p className="text-foreground-muted mt-2">
              {product.shortDescription}
            </p>
          )}

          <div className="mt-6">
            <ProductPurchase
              productId={product.id}
              productName={product.name}
              attributes={attributes}
              variants={variants}
              customFields={product.customFields.map((f) => ({
                key: f.key,
                label: f.label,
                helpText: f.helpText,
                type: f.type,
                isRequired: f.isRequired,
                maxLength: f.maxLength,
                options: Array.isArray(f.options) ? f.options.map(String) : [],
              }))}
              lowStockThreshold={
                product.lowStockThreshold ??
                commerce.lowStockThreshold ??
                DEFAULT_LOW_STOCK_THRESHOLD
              }
              lastUnitsThreshold={
                product.lastUnitsThreshold ??
                commerce.lastUnitsThreshold ??
                DEFAULT_LAST_UNITS_THRESHOLD
              }
            />
          </div>

          {contact.whatsapp && (
            <div className="mt-4">
              <WhatsappProductButton
                phone={contact.whatsapp}
                template={contact.whatsappMessage}
                productName={product.name}
                productUrl={`${publicEnv.siteUrl}/producto/${product.slug}`}
              />
            </div>
          )}
          {session && (
            <div className="mt-3">
              <FavoriteButton
                productId={product.id}
                initialFavorite={favorite}
              />
            </div>
          )}

          <dl className="border-border mt-6 space-y-1 border-t pt-4 text-sm">
            {product.material && (
              <Row label="Material" value={product.material} />
            )}
            {product.dimensions && (
              <Row label="Dimensiones" value={product.dimensions} />
            )}
            {product.weightGrams && (
              <Row label="Peso" value={`${product.weightGrams} g`} />
            )}
          </dl>
        </div>
      </div>

      {description && (
        <section className="mt-10 max-w-prose">
          <h2 className="text-lg font-semibold">Descripción</h2>
          <p className="text-foreground-muted mt-2 text-sm leading-relaxed whitespace-pre-line">
            {description}
          </p>
        </section>
      )}

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        <div className="bg-surface rounded-card border p-5">
          <Truck className="text-brand size-5" />
          <h2 className="mt-3 text-sm font-semibold">Despacho y retiro</h2>
          <p className="text-foreground-muted mt-1 text-sm">
            {product.allowsShipping
              ? "Disponible con despacho según cobertura."
              : "Este producto no admite despacho."}{" "}
            {product.allowsPickup && "También puedes coordinar retiro."}
          </p>
        </div>
        <div className="bg-surface rounded-card border p-5">
          <RefreshCw className="text-brand size-5" />
          <h2 className="mt-3 text-sm font-semibold">Cambios y devoluciones</h2>
          <p className="text-foreground-muted mt-1 text-sm">
            Revisa las condiciones aplicables antes de comprar.
          </p>
          <Link
            href="/cambios-devoluciones"
            className="text-brand mt-2 inline-block text-sm font-medium"
          >
            Ver condiciones →
          </Link>
        </div>
        <div className="bg-surface rounded-card border p-5">
          <ShieldCheck className="text-brand size-5" />
          <h2 className="mt-3 text-sm font-semibold">Compra con confianza</h2>
          <p className="text-foreground-muted mt-1 text-sm">
            Precios finales con IVA incluido y stock validado por nuestro
            sistema.
          </p>
        </div>
      </section>

      <section className="mt-10 max-w-3xl">
        <h2 className="text-lg font-semibold">Preguntas frecuentes</h2>
        <div className="mt-4 space-y-3">
          <details className="bg-surface rounded-card border p-4">
            <summary className="cursor-pointer font-medium">
              ¿Cuándo estará listo mi pedido?
            </summary>
            <p className="text-foreground-muted mt-3 text-sm">
              El plazo depende del producto y la forma de entrega. Te
              informaremos el avance mediante el seguimiento de tu pedido.
            </p>
          </details>
          <details className="bg-surface rounded-card border p-4">
            <summary className="cursor-pointer font-medium">
              ¿Puedo pedir una versión personalizada?
            </summary>
            <p className="text-foreground-muted mt-3 text-sm">
              Sí. Envíanos tu idea desde la sección de personalizados y
              revisaremos contigo los detalles.
            </p>
          </details>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-lg font-semibold">
            También podría interesarte
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-14">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold">Reseñas verificadas</h2>
            <p className="text-foreground-muted mt-1 text-sm">
              Opiniones de clientes que compraron este producto.
            </p>
          </div>
          {reviewData.count > 0 && (
            <p className="font-semibold">
              ★ {reviewData.average.toFixed(1)} · {reviewData.count}
            </p>
          )}
        </div>
        {reviewData.reviews.length ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {reviewData.reviews.map((review) => (
              <article
                key={review.id}
                className="bg-surface rounded-card border p-5"
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
                  <h3 className="mt-2 font-semibold">{review.title}</h3>
                )}
                <p className="text-foreground-muted mt-2 text-sm leading-relaxed">
                  {review.content}
                </p>
                <p className="mt-3 text-xs font-medium">
                  {review.account.firstName ||
                    review.account.name.split(" ")[0]}{" "}
                  · Compra verificada
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-foreground-muted rounded-card mt-5 border border-dashed p-5 text-sm">
            Este producto todavía no tiene reseñas. Las opiniones solo pueden
            publicarlas clientes con una compra pagada.
          </p>
        )}
      </section>

      <p className="text-foreground-muted mt-10 text-xs">
        Precio de referencia desde {formatCLP(priceSummary.from)} · IVA
        incluido.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-foreground-muted w-28 shrink-0">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
