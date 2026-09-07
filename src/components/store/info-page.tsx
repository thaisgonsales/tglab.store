import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getInfoPage } from "@/server/services/pages-service";

export async function buildInfoMetadata(slug: string): Promise<Metadata> {
  const page = await getInfoPage(slug);
  if (!page) return {};
  return {
    title: page.seoTitle ?? page.title,
    description: page.seoDescription,
  };
}

export async function InfoPage({ slug }: { slug: string }) {
  const page = await getInfoPage(slug);
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">{page.title}</h1>
      <div className="text-foreground-muted mt-6 space-y-4 text-sm leading-relaxed">
        {page.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {page.isPlaceholder && (
        <p className="border-border text-foreground-muted mt-8 rounded-md border border-dashed p-3 text-xs">
          Contenido editable desde el panel de administración.
        </p>
      )}
    </div>
  );
}
