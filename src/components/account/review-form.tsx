"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitVerifiedReview } from "@/server/actions/engagement-actions";

export function ReviewForm({ orderItemId }: { orderItemId: string }) {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  if (sent)
    return (
      <p className="text-sm text-emerald-700">
        Gracias. Tu reseña verificada fue publicada.
      </p>
    );
  return (
    <form
      className="mt-3 space-y-3"
      onSubmit={async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setPending(true);
        const data = new FormData(event.currentTarget);
        const result = await submitVerifiedReview({
          orderItemId,
          rating: data.get("rating"),
          title: data.get("title"),
          content: data.get("content"),
        });
        setPending(false);
        if (!result.ok) return toast.error(result.error);
        setSent(true);
      }}
    >
      <select
        name="rating"
        aria-label="Calificación"
        className="border-border bg-surface h-10 rounded-md border px-3 text-sm"
        defaultValue="5"
      >
        {[5, 4, 3, 2, 1].map((rating) => (
          <option key={rating} value={rating}>
            {rating} estrella{rating === 1 ? "" : "s"}
          </option>
        ))}
      </select>
      <Input name="title" maxLength={80} placeholder="Título opcional" />
      <Textarea
        name="content"
        required
        minLength={10}
        maxLength={1200}
        placeholder="Cuéntanos qué te pareció el producto"
      />
      <Button size="sm" disabled={pending}>
        {pending ? "Publicando…" : "Publicar reseña"}
      </Button>
    </form>
  );
}
