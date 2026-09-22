import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { QuickAddButton } from "@/components/store/quick-add-button";
import { formatCLP } from "@/lib/money";
import { summarizePrice } from "@/lib/product-price";
import type { ProductCardData } from "@/server/services/catalog-service";

export function ProductCard({ product }: { product: ProductCardData }) {
  const image = product.media[0];
  const price = summarizePrice(product.variants);

  return (
    <article
      data-reveal-item
      className="group rounded-card border-border bg-surface flex flex-col overflow-hidden border shadow-[0_10px_35px_rgba(58,43,40,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(58,43,40,0.12)]"
    >
      <Link href={`/producto/${product.slug}`} className="block">
        <div className="bg-surface-muted relative aspect-square">
          {image ? (
            <Image
              src={image.url}
              alt={image.alt ?? product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover"
              placeholder={image.blurDataUrl ? "blur" : "empty"}
              blurDataURL={image.blurDataUrl ?? undefined}
            />
          ) : (
            <div className="text-foreground-muted flex h-full items-center justify-center text-xs">
              Sin imagen
            </div>
          )}
          {price.discountPercent > 0 && (
            <Badge variant="offer" className="absolute top-2 left-2">
              -{price.discountPercent}%
            </Badge>
          )}
          {!price.inStock && (
            <Badge variant="neutral" className="absolute top-2 right-2">
              Agotado
            </Badge>
          )}
          {product.variants.length === 1 && price.inStock && (
            <Badge variant="brand" className="absolute top-2 right-2">
              Disponible
            </Badge>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link href={`/producto/${product.slug}`}>
          <h3 className="group-hover:text-brand line-clamp-2 text-sm font-semibold">
            {product.name}
          </h3>
        </Link>
        {product.shortDescription && (
          <p className="text-foreground-muted line-clamp-2 text-xs leading-relaxed">
            {product.shortDescription}
          </p>
        )}
        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <span className="font-semibold">
            {price.hasRange ? "Desde " : ""}
            {formatCLP(price.from)}
          </span>
          {price.compareAt && (
            <span className="text-foreground-muted text-xs line-through">
              {formatCLP(price.compareAt)}
            </span>
          )}
        </div>
        <div className="mt-2 flex gap-2">
          {product.variants.length === 1 && product.variants[0]!.stock > 0 ? (
            <QuickAddButton variantId={product.variants[0]!.id} />
          ) : null}
          <Link
            href={`/producto/${product.slug}`}
            className="border-border hover:bg-surface-muted flex h-8 flex-1 items-center justify-center rounded-md border px-3 text-xs font-medium"
          >
            Ver detalles
          </Link>
        </div>
      </div>
    </article>
  );
}
