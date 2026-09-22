"use client";

import { Heart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleFavorite } from "@/server/actions/engagement-actions";

export function FavoriteButton({
  productId,
  initialFavorite,
}: {
  productId: string;
  initialFavorite: boolean;
}) {
  const [favorite, setFavorite] = useState(initialFavorite);
  const [pending, setPending] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      aria-pressed={favorite}
      onClick={async () => {
        setPending(true);
        const result = await toggleFavorite(productId);
        setPending(false);
        if (!result.ok) return toast.error(result.error);
        setFavorite(result.favorite);
        toast.success(
          result.favorite ? "Guardado en favoritos" : "Quitado de favoritos",
        );
      }}
    >
      <Heart className={favorite ? "fill-brand text-brand" : ""} />{" "}
      {favorite ? "En favoritos" : "Guardar en favoritos"}
    </Button>
  );
}
