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
      data-reveal-kind="scale"
      className="group rounded-card border-border/80 bg-surface hover:border-brand/30 flex flex-col overflow-hidden border shadow-[0_8px_24px_rgba(41,39,45,.045)] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(41,39,45,.1)]"
    >
      <Link href={`/producto/${product.slug}`} className="block">
        <div className="bg-surface-muted relative aspect-square overflow-hidden">
          {image ? (
            <Image
              src={image.url}
              alt={image.alt ?? product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.035]"
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
          <span className="text-brand text-[15px] font-bold">
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
            className="border-brand/25 text-brand hover:bg-surface-muted hover:border-brand/50 flex h-8 flex-1 items-center justify-center rounded-lg border px-3 text-xs font-semibold transition-[background-color,border-color,transform] hover:-translate-y-0.5"
          >
            Ver detalles
          </Link>
        </div>
      </div>
    </article>
  );
}
