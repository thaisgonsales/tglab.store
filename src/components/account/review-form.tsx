"use client";

import { useState, type FormEvent } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitVerifiedReview } from "@/server/actions/engagement-actions";

export function ReviewForm({ orderItemId }: { orderItemId: string }) {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [rating, setRating] = useState(5);
  if (sent)
    return (
      <p className="text-sm text-emerald-700">
        Gracias. Tu reseña verificada quedó pendiente de aprobación.
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
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Tu calificación</legend>
        <input type="hidden" name="rating" value={rating} />
        <div className="flex gap-1" aria-label={`${rating} de 5 estrellas`}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`${value} ${value === 1 ? "estrella" : "estrellas"}`}
              aria-pressed={rating === value}
              onClick={() => setRating(value)}
              className="text-brand rounded-md p-1 transition-transform hover:-translate-y-0.5 hover:scale-110"
            >
              <Star
                className="size-6"
                fill={value <= rating ? "currentColor" : "none"}
              />
            </button>
          ))}
        </div>
      </fieldset>
      <Input name="title" maxLength={80} placeholder="Título opcional" />
      <Textarea
        name="content"
        required
        minLength={10}
        maxLength={1200}
        placeholder="Cuéntanos tu experiencia"
      />
      <Button size="sm" disabled={pending}>
        {pending ? "Enviando…" : "Enviar reseña"}
      </Button>
    </form>
  );
}
