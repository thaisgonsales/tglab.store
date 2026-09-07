import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { formatCLP } from "@/lib/money";
import { summarizePrice } from "@/lib/product-price";
import { getPublishedProductBySlug } from "@/server/services/catalog-service";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublishedProductBySlug(slug);
  if (!product) return { title: "Producto no encontrado" };
  return {
    title: product.seoTitle ?? product.name,
    description:
      product.seoDescription ?? product.shortDescription ?? undefined,
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

  const price = summarizePrice(product.variants);
  const images = product.media.filter((m) => m.type === "IMAGE");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-3">
          <div className="rounded-card bg-surface-muted relative aspect-square overflow-hidden">
            {images[0] ? (
              <Image
                src={images[0].url}
                alt={images[0].alt ?? product.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="text-foreground-muted flex h-full items-center justify-center text-sm">
                Sin imagen
              </div>
            )}
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {product.name}
          </h1>
          {product.shortDescription && (
            <p className="text-foreground-muted mt-2">
              {product.shortDescription}
            </p>
          )}

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-2xl font-semibold">
              {price.hasRange ? "Desde " : ""}
              {formatCLP(price.from)}
            </span>
            {price.compareAt && (
              <span className="text-foreground-muted line-through">
                {formatCLP(price.compareAt)}
              </span>
            )}
            {price.discountPercent > 0 && (
              <Badge variant="brand">-{price.discountPercent}%</Badge>
            )}
          </div>

          <p className="mt-2 text-sm">
            {price.inStock ? (
              <span className="text-emerald-600">En stock</span>
            ) : (
              <span className="text-foreground-muted">Agotado</span>
            )}
          </p>

          <div className="rounded-card border-border text-foreground-muted mt-6 border border-dashed p-4 text-sm">
            El selector de variantes, la galería con video, la personalización y
            el botón &ldquo;Agregar al carrito&rdquo; se implementan en las
            Fases 5 y 6.
          </div>
        </div>
      </div>
    </div>
  );
}
