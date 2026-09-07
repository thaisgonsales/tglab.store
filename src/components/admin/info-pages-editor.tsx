"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { InfoPageSlug } from "@/config/info-pages";
import { useAction } from "@/lib/use-action";
import { saveInfoPage } from "@/server/actions/page-actions";

type PageData = {
  slug: InfoPageSlug;
  title: string;
  body: string;
  isPublished: boolean;
  isPlaceholder: boolean;
  seoTitle: string;
  seoDescription: string;
};

export function InfoPagesEditor({ pages }: { pages: PageData[] }) {
  const [active, setActive] = useState<InfoPageSlug>(pages[0]!.slug);
  const page = pages.find((p) => p.slug === active)!;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5 text-sm">
        {pages.map((p) => (
          <button
            key={p.slug}
            type="button"
            onClick={() => setActive(p.slug)}
            className={`rounded-full border px-3 py-1 ${
              active === p.slug ? "border-brand bg-brand/10" : "border-border"
            }`}
          >
            {p.title}
            {p.isPlaceholder && (
              <span className="text-foreground-muted ml-1 text-xs">•</span>
            )}
          </button>
        ))}
      </div>
      <PageForm key={page.slug} page={page} />
    </div>
  );
}

function PageForm({ page }: { page: PageData }) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: page.title,
    body: page.body,
    isPublished: page.isPublished,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
  });

  const save = useAction(saveInfoPage, {
    successMessage: "Página guardada",
    onSuccess: () => router.refresh(),
  });

  return (
    <div className="rounded-card border-border bg-surface space-y-4 border p-5">
      {page.isPlaceholder && (
        <Badge variant="warning">Contenido por defecto — aún no editado</Badge>
      )}
      <div className="space-y-1.5">
        <Label>Título</Label>
        <Input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Contenido</Label>
        <Textarea
          rows={14}
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
        />
        <p className="text-foreground-muted text-xs">
          Separa los párrafos con una línea en blanco.
        </p>
      </div>
      <div className="border-border flex items-center justify-between rounded-md border p-3">
        <span className="text-sm">Publicada</span>
        <Switch
          checked={form.isPublished}
          onCheckedChange={(v) => setForm({ ...form, isPublished: v })}
        />
      </div>
      <details className="border-border rounded-md border p-3">
        <summary className="cursor-pointer text-sm font-medium">SEO</summary>
        <div className="mt-3 space-y-3">
          <div className="space-y-1.5">
            <Label>Título SEO</Label>
            <Input
              value={form.seoTitle}
              onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Meta description</Label>
            <Textarea
              rows={2}
              value={form.seoDescription}
              onChange={(e) =>
                setForm({ ...form, seoDescription: e.target.value })
              }
            />
          </div>
        </div>
      </details>
      <Button
        size="sm"
        disabled={save.isPending}
        onClick={() =>
          save.run({
            slug: page.slug,
            title: form.title,
            body: form.body,
            isPublished: form.isPublished,
            seoTitle: form.seoTitle || undefined,
            seoDescription: form.seoDescription || undefined,
          })
        }
      >
        Guardar
      </Button>
    </div>
  );
}
