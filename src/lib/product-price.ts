import { discountPercent } from "@/lib/money";

export type VariantPricing = {
  price: number;
  compareAtPrice: number | null;
  stock: number;
};

export type ProductPriceSummary = {
  /** Precio más bajo entre las variantes activas. */
  from: number;
  /** `true` si hay variantes con distinto precio. */
  hasRange: boolean;
  /** Mayor "precio anterior" asociado al precio mínimo (para mostrar descuento). */
  compareAt: number | null;
  discountPercent: number;
  inStock: boolean;
  totalStock: number;
};

export function summarizePrice(
  variants: VariantPricing[],
): ProductPriceSummary {
  if (variants.length === 0) {
    return {
      from: 0,
      hasRange: false,
      compareAt: null,
      discountPercent: 0,
      inStock: false,
      totalStock: 0,
    };
  }

  const prices = variants.map((v) => v.price);
  const from = Math.min(...prices);
  const max = Math.max(...prices);
  const cheapest = variants.filter((v) => v.price === from);
  const compareAt = cheapest.reduce<number | null>((acc, v) => {
    if (v.compareAtPrice && v.compareAtPrice > v.price) {
      return Math.max(acc ?? 0, v.compareAtPrice);
    }
    return acc;
  }, null);
  const totalStock = variants.reduce((acc, v) => acc + Math.max(v.stock, 0), 0);

  return {
    from,
    hasRange: from !== max,
    compareAt,
    discountPercent: compareAt ? discountPercent(compareAt, from) : 0,
    inStock: totalStock > 0,
    totalStock,
  };
}
