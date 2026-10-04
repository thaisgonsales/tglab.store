import "server-only";

import { cache } from "react";

import { db } from "@/server/db";
import { ChilexpressProvider } from "@/server/providers/shipping/chilexpress";

/**
 * Cálculo de despacho. Las zonas, comunas cubiertas y tarifas se configuran
 * desde /admin/despachos (tablas ShippingZone / ShippingZoneLocation /
 * ShippingRate). Aquí solo se resuelve qué aplica a un destino concreto.
 */

export type ShippingOption = {
  rateId: string;
  zoneId: string;
  zoneName: string;
  name: string;
  deliveryType: "HOME" | "PICKUP_POINT" | "LOCAL_DELIVERY";
  price: number;
  /** true si el precio quedó en 0 por superar `freeOverSubtotal`. */
  free: boolean;
};

type Context = {
  region: string;
  comuna: string;
  subtotal: number;
  weightGrams: number;
};

/**
 * Devuelve las opciones de despacho disponibles para el destino.
 * Vacío = sin cobertura (el checkout ofrecerá solo retiro o "contáctanos").
 */
export async function getShippingOptions(
  ctx: Context,
): Promise<ShippingOption[]> {
  const zones = await db.shippingZone.findMany({
    where: {
      isActive: true,
      locations: {
        some: {
          region: ctx.region,
          OR: [{ comuna: null }, { comuna: ctx.comuna }],
        },
      },
    },
    include: {
      rates: { where: { isActive: true }, orderBy: { position: "asc" } },
    },
    orderBy: { position: "asc" },
  });

  const options: ShippingOption[] = [];
  for (const zone of zones) {
    for (const rate of zone.rates) {
      if (
        rate.minWeightGrams !== null &&
        ctx.weightGrams < rate.minWeightGrams
      ) {
        continue;
      }
      if (
        rate.maxWeightGrams !== null &&
        ctx.weightGrams > rate.maxWeightGrams
      ) {
        continue;
      }
      const free =
        rate.freeOverSubtotal !== null && ctx.subtotal >= rate.freeOverSubtotal;
      options.push({
        rateId: rate.id,
        zoneId: zone.id,
        zoneName: zone.name,
        name: rate.name,
        deliveryType: rate.deliveryType,
        price: free ? 0 : rate.price,
        free: free || rate.price === 0,
      });
    }
  }

  // La cotización externa siempre ocurre en el servidor. Ante una caída del
  // proveedor se conservan las opciones locales y nunca se inventa un precio.
  try {
    const quotes = await new ChilexpressProvider().quote({
      destinationComuna: ctx.comuna,
      weightGrams: ctx.weightGrams,
      declaredWorth: ctx.subtotal,
    });
    for (const quote of quotes) {
      options.push({
        rateId: `chilexpress:${quote.serviceCode}:${ctx.comuna}`,
        zoneId: "chilexpress",
        zoneName: "Chilexpress",
        name: quote.description,
        deliveryType: "HOME",
        price: quote.price,
        free: quote.price === 0,
      });
    }
  } catch (error) {
    console.error("[chilexpress:quote]", error);
  }

  // Ordena por precio ascendente y deduplica por (nombre, precio).
  options.sort((a, b) => a.price - b.price);
  const seen = new Set<string>();
  return options.filter((o) => {
    const key = `${o.name}|${o.price}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Resuelve y valida una tarifa concreta contra el destino (uso server-side en
 * la creación del pedido — nunca se confía en el precio del cliente).
 */
export async function resolveShippingRate(
  rateId: string,
  ctx: Context,
): Promise<ShippingOption | null> {
  const options = await getShippingOptions(ctx);
  return options.find((o) => o.rateId === rateId) ?? null;
}

/** Config de retiro y estado del despacho, para el checkout. */
export const getFulfillmentConfig = cache(async () => {
  try {
    const zonesCount = await db.shippingZone.count({
      where: { isActive: true },
    });
    return { hasShipping: zonesCount > 0 };
  } catch {
    return { hasShipping: false };
  }
});
