"use client";

import { Loader2, Upload, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitCustomRequest } from "@/server/actions/custom-request-actions";

type RefFile = {
  url: string;
  storageKey: string | null;
  mimeType: string;
  sizeBytes: number;
};

export function CustomRequestForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    description: "",
    quantity: "",
    desiredDate: "",
    notes: "",
    company: "", // honeypot
  });
  const [files, setFiles] = useState<RefFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(list: FileList) {
    if (files.length + list.length > 6) {
      toast.error("Máximo 6 imágenes.");
      return;
    }
    setUploading(true);
    try {
      for (const file of Array.from(list)) {
        const fd = new FormData();
        fd.set("file", file);
        const res = await fetch("/api/uploads/custom-request", {
          method: "POST",
          body: fd,
        });
        const json = (await res.json()) as RefFile & { error?: string };
        if (!res.ok) {
          toast.error(json.error ?? "No se pudo subir la imagen");
          continue;
        }
        setFiles((f) => [...f, json]);
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const result = await submitCustomRequest({
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      description: form.description,
      quantity: form.quantity ? Number(form.quantity) : undefined,
      desiredDate: form.desiredDate || undefined,
      notes: form.notes || undefined,
      company: form.company,
      files,
    });
    setSubmitting(false);
    if (result.ok) {
      setDone(true);
    } else {
      toast.error(result.error);
    }
  }

  if (done) {
    return (
      <div className="rounded-card border-border bg-surface border p-6 text-center">
        <h2 className="text-lg font-semibold">¡Solicitud enviada!</h2>
        <p className="text-foreground-muted mt-2 text-sm">
          Te contactaremos con una cotización al email que indicaste. Recuerda
          que enviar esta solicitud no constituye una compra.
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/productos">Ver productos</Link>
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-card border-border bg-surface space-y-5 border p-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </Field>
        <Field label="Teléfono / WhatsApp (opcional)">
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </Field>
        <Field label="Cantidad aproximada (opcional)">
          <Input
            type="number"
            min={1}
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          />
        </Field>
        <Field label="Fecha aproximada que la necesitas (opcional)">
          <Input
            type="date"
            value={form.desiredDate}
            onChange={(e) => setForm({ ...form, desiredDate: e.target.value })}
          />
        </Field>
      </div>

      <Field label="Descripción de lo que necesitas">
        <Textarea
          rows={5}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Cuéntanos qué quieres, medidas, colores, para qué lo usarás…"
          required
        />
      </Field>

      <Field label="Observaciones (opcional)">
        <Textarea
          rows={2}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </Field>

      <div>
        <Label>Imágenes de referencia (opcional, hasta 6)</Label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <span
              key={f.url}
              className="border-border relative size-20 overflow-hidden rounded-md border"
            >
              <Image
                src={f.url}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
              <button
                type="button"
                aria-label="Quitar"
                onClick={() => setFiles((x) => x.filter((_, idx) => idx !== i))}
                className="absolute top-0.5 right-0.5 rounded bg-black/60 p-0.5 text-white"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          {files.length < 6 && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="border-border text-foreground-muted flex size-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs"
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Subir
            </button>
          )}
        </div>
      </div>

      {/* honeypot */}
      <input
        type="text"
        name="company"
        autoComplete="off"
        tabIndex={-1}
        value={form.company}
        onChange={(e) => setForm({ ...form, company: e.target.value })}
        className="hidden"
        aria-hidden
      />

      <p className="bg-surface-muted text-foreground-muted rounded-md p-3 text-xs">
        Enviar esta solicitud{" "}
        <strong>no constituye automáticamente una compra</strong>. Te enviaremos
        una cotización y tú decides si continuar.
      </p>

      <Button type="submit" disabled={submitting || uploading}>
        {submitting ? "Enviando…" : "Enviar solicitud"}
      </Button>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
