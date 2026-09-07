import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatCLP } from "@/lib/money";
import { summarizePrice } from "@/lib/product-price";
import type { ProductCardData } from "@/server/services/catalog-service";

export function ProductCard({ product }: { product: ProductCardData }) {
  const image = product.media[0];
  const price = summarizePrice(product.variants);

  return (
    <Link
      href={`/producto/${product.slug}`}
      className="group rounded-card border-border bg-surface flex flex-col overflow-hidden border transition-shadow hover:shadow-md"
    >
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
          <Badge variant="brand" className="absolute top-2 left-2">
            -{price.discountPercent}%
          </Badge>
        )}
        {!price.inStock && (
          <Badge variant="neutral" className="absolute top-2 right-2">
            Agotado
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-medium">{product.name}</h3>
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
      </div>
    </Link>
  );
}
