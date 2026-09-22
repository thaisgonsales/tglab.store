import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

import { listStoreCategories } from "@/server/services/catalog-service";

export const metadata: Metadata = { title: "Categorías" };

export default async function CategoriesPage() {
  const categories = await listStoreCategories();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <p className="text-brand text-sm font-semibold tracking-[.16em] uppercase">
        Explora TG LAB
      </p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">
        Encuentra tu próximo favorito
      </h1>
      <p className="text-foreground-muted mt-3 max-w-2xl">
        Decoración, organización, accesorios y diseños para hacer cada espacio
        más tuyo.
      </p>

      {categories.length === 0 ? (
        <p className="text-foreground-muted mt-6 text-sm">
          Estamos preparando nuevas colecciones para ti.
        </p>
      ) : (
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <li
              key={cat.id}
              className="border-border bg-surface overflow-hidden rounded-[1.25rem] border"
            >
              <Link
                href={`/categoria/${cat.slug}`}
                className="bg-surface-muted relative block aspect-[16/9]"
              >
                {cat.imageUrl ? (
                  <Image
                    src={cat.imageUrl}
                    alt={cat.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(239,157,104,.55),transparent_40%),linear-gradient(145deg,#eadbc5,#d7b7c6)]" />
                )}
              </Link>
              <div className="p-5">
                <Link
                  href={`/categoria/${cat.slug}`}
                  className="hover:text-brand font-medium"
                >
                  {cat.name}
                </Link>
                {cat.description && (
                  <p className="text-foreground-muted mt-2 line-clamp-2 text-sm">
                    {cat.description}
                  </p>
                )}
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
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
