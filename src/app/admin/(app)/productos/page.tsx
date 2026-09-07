import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { ProductListTable } from "@/components/admin/product-list-table";
import { Button } from "@/components/ui/button";
import {
  categoryOptions,
  listAdminProducts,
} from "@/server/services/admin-catalog-service";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  status?: string;
  categoria?: string;
  page?: string;
};

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const status = ["DRAFT", "PUBLISHED", "HIDDEN", "ARCHIVED"].includes(
    sp.status ?? "",
  )
    ? (sp.status as "DRAFT" | "PUBLISHED" | "HIDDEN" | "ARCHIVED")
    : undefined;

  const [result, categories] = await Promise.all([
    listAdminProducts({
      q: sp.q?.trim() || undefined,
      status,
      categoryId: sp.categoria || undefined,
      page: Number(sp.page) || 1,
    }),
    categoryOptions(),
  ]);

  return (
    <div>
      <PageHeader
        title="Productos"
        description={`${result.total} producto(s)`}
        action={
          <Button asChild size="sm">
            <Link href="/admin/productos/nuevo">Nuevo producto</Link>
          </Button>
        }
      />
      <ProductListTable
        result={result}
        categories={categories}
        filters={{
          q: sp.q ?? "",
          status: sp.status ?? "",
          categoria: sp.categoria ?? "",
        }}
      />
    </div>
  );
}
