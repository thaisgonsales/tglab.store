"use server";

import { revalidatePath } from "next/cache";
import { type z } from "zod";

import {
  addToCartSchema,
  updateCartLineSchema,
  type AddToCartInput,
} from "@/lib/schemas/cart";
import { ActionError } from "@/server/auth/action-guard";
import type { ActionResult } from "@/server/auth/action-guard";
import { db } from "@/server/db";
import { getOrCreateCart, getCartToken } from "@/server/services/cart-service";

function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}
function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return ok(await fn());
  } catch (err) {
    if (err instanceof ActionError) return fail(err.message);
    console.error("[cart-actions]", err);
    return fail("No se pudo actualizar el carrito. Intenta nuevamente.");
  }
}

export async function addToCart(
  input: AddToCartInput,
): Promise<ActionResult<{ itemCount: number }>> {
  return run(async () => {
    const data = addToCartSchema.parse(input);

    const variant = await db.productVariant.findUnique({
      where: { id: data.variantId },
      include: {
        product: {
          select: {
            status: true,
            archivedAt: true,
            customFields: true,
          },
        },
      },
    });
    if (
      !variant ||
      !variant.isActive ||
      variant.product.status !== "PUBLISHED" ||
      variant.product.archivedAt
    ) {
      throw new ActionError("Este producto ya no está disponible.");
    }

    // Validación de campos personalizados obligatorios.
    const provided = new Map(
      data.customizations.map((c) => [c.key, c.value.trim()]),
    );
    for (const field of variant.product.customFields) {
      const value = provided.get(field.key) ?? "";
      if (field.isRequired && value === "") {
        throw new ActionError(`Completa el campo "${field.label}".`);
      }
      if (field.maxLength && value.length > field.maxLength) {
        throw new ActionError(
          `"${field.label}" supera el máximo de ${field.maxLength} caracteres.`,
        );
      }
    }
    const customizations = variant.product.customFields
      .map((f) => ({
        key: f.key,
        label: f.label,
        value: provided.get(f.key) ?? "",
      }))
      .filter((c) => c.value !== "");

    const cart = await getOrCreateCart();

    // Mismo variante + mismas personalizaciones = misma línea (suma cantidad).
    const existing = await db.cartItem.findFirst({
      where: { cartId: cart.id, variantId: data.variantId },
    });
    const sameCustom =
      existing &&
      JSON.stringify(existing.customizations ?? []) ===
        JSON.stringify(customizations);

    const targetQty = sameCustom
      ? existing.quantity + data.quantity
      : data.quantity;
    if (targetQty > variant.stock) {
      throw new ActionError(
        variant.stock === 0
          ? "Sin stock disponible."
          : `Solo quedan ${variant.stock} unidades.`,
      );
    }

    if (sameCustom) {
      await db.cartItem.update({
        where: { id: existing.id },
        data: { quantity: targetQty },
      });
    } else {
      await db.cartItem.create({
        data: {
          cartId: cart.id,
          variantId: data.variantId,
          quantity: data.quantity,
          customizations,
        },
      });
    }

    revalidatePath("/", "layout");
    revalidatePath("/carrito");

    const agg = await db.cartItem.aggregate({
      where: { cartId: cart.id },
      _sum: { quantity: true },
    });
    return { itemCount: agg._sum.quantity ?? 0 };
  });
}

export async function updateCartLine(
  input: z.infer<typeof updateCartLineSchema>,
): Promise<ActionResult<null>> {
  return run(async () => {
    const { lineId, quantity } = updateCartLineSchema.parse(input);
    const token = await getCartToken();
    if (!token) throw new ActionError("Tu carrito ya no existe.");

    const line = await db.cartItem.findFirst({
      where: { id: lineId, cart: { token } },
      include: { variant: { select: { stock: true } } },
    });
    if (!line) throw new ActionError("Esa línea ya no está en el carrito.");

    if (quantity === 0) {
      await db.cartItem.delete({ where: { id: lineId } });
    } else {
      if (quantity > line.variant.stock) {
        throw new ActionError(`Solo quedan ${line.variant.stock} unidades.`);
      }
      await db.cartItem.update({ where: { id: lineId }, data: { quantity } });
    }
    revalidatePath("/", "layout");
    revalidatePath("/carrito");
    return null;
  });
}

export async function removeCartLine(
  lineId: string,
): Promise<ActionResult<null>> {
  return updateCartLine({ lineId, quantity: 0 });
}

export async function clearCart(): Promise<ActionResult<null>> {
  return run(async () => {
    const token = await getCartToken();
    if (!token) return null;
    await db.cartItem.deleteMany({ where: { cart: { token } } });
    revalidatePath("/", "layout");
    revalidatePath("/carrito");
    return null;
  });
}
