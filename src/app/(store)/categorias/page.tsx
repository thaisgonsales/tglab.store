import type { Metadata } from "next";
import Link from "next/link";

import { db } from "@/server/db";

export const metadata: Metadata = { title: "Categorías" };

async function getCategories() {
  try {
    return await db.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { position: "asc" },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { position: "asc" },
        },
      },
    });
  } catch {
    return [];
  }
}

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Categorías</h1>

      {categories.length === 0 ? (
        <p className="text-foreground-muted mt-6 text-sm">
          Todavía no hay categorías. Se crean desde el panel de administración.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {categories.map((cat) => (
            <li
              key={cat.id}
              className="rounded-card border-border bg-surface border p-4"
            >
              <Link
                href={`/categoria/${cat.slug}`}
                className="hover:text-brand font-medium"
              >
                {cat.name}
              </Link>
              {cat.children.length > 0 && (
                <ul className="text-foreground-muted mt-2 space-y-1 text-sm">
                  {cat.children.map((child) => (
                    <li key={child.id}>
                      <Link
                        href={`/categoria/${child.slug}`}
                        className="hover:text-foreground"
                      >
                        {child.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
