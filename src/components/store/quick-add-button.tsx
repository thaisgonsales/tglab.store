"use client";

import { Loader2, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { addToCart } from "@/server/actions/cart-actions";

export function QuickAddButton({ variantId }: { variantId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function add() {
    setPending(true);
    const result = await addToCart({
      variantId,
      quantity: 1,
      customizations: [],
    });
    setPending(false);
    if (!result.ok) return toast.error(result.error);
    toast.success("Producto agregado al carrito");
    router.refresh();
  }

  return (
    <Button
      type="button"
      size="sm"
      onClick={add}
      disabled={pending}
      aria-label="Compra rápida"
      className="flex-1"
    >
      {pending ? <Loader2 className="animate-spin" /> : <ShoppingBag />}
      Agregar
    </Button>
  );
}
