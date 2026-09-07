import { PageHeader } from "@/components/admin/page-header";
import { CategoryManager } from "@/components/admin/category-manager";
import { listAdminCategories } from "@/server/services/admin-catalog-service";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await listAdminCategories();

  const roots = categories
    .filter((c) => !c.parentId)
    .map((root) => ({
      ...root,
      children: categories.filter((c) => c.parentId === root.id),
    }));

  return (
    <div>
      <PageHeader
        title="Categorías"
        description="Organiza el catálogo en categorías y subcategorías (2 niveles)."
      />
      <CategoryManager
        roots={roots.map(serialize)}
        allOptions={roots.map((r) => ({ id: r.id, name: r.name }))}
      />
    </div>
  );
}

type Row = Awaited<ReturnType<typeof listAdminCategories>>[number];

function serialize(row: Row & { children: Row[] }) {
  const base = (r: Row) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description ?? "",
    parentId: r.parentId,
    isActive: r.isActive,
    seoTitle: r.seoTitle ?? "",
    seoDescription: r.seoDescription ?? "",
    productCount: r._count.products,
  });
  return { ...base(row), children: row.children.map(base) };
}
