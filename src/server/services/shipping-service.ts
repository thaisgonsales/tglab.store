import "server-only";

import { cache } from "react";

import { db } from "@/server/db";
import { ChilexpressProvider } from "@/server/providers/shipping/chilexpress";
import {
  encodeEnviaRateId,
  EnviaProvider,
  type EnviaPackage,
} from "@/server/providers/shipping/envia";

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

/** Resuelve el código postal técnico que Envia requiere para una comuna. */
export async function resolveShippingPostalCode(
  comuna: string,
): Promise<string | null> {
  const provider = new EnviaProvider();
  if (!provider.isConfigured()) return null;
  try {
    return await provider.locatePostalCode(comuna);
  } catch (error) {
    console.error("[envia:postal-code]", error);
    return null;
  }
}

type Context = {
  region: string;
  comuna: string;
  subtotal: number;
  weightGrams: number;
  postalCode?: string;
  street?: string;
  number?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  addressNotes?: string;
  packages?: EnviaPackage[];
};

const REGION_CODES: Record<string, string> = {
  "Región de Arica y Parinacota": "AP",
  "Región de Tarapacá": "TA",
  "Región de Antofagasta": "AN",
  "Región de Atacama": "AT",
  "Región de Coquimbo": "CO",
  "Región de Valparaíso": "VS",
  "Región Metropolitana de Santiago": "RM",
  "Región del Libertador General Bernardo O’Higgins": "LI",
  "Región del Libertador General Bernardo O'Higgins": "LI",
  "Región del Maule": "ML",
  "Región de Ñuble": "NB",
  "Región del Biobío": "BI",
  "Región de La Araucanía": "AR",
  "Región de Los Ríos": "LR",
  "Región de Los Lagos": "LL",
  "Región de Aysén del General Carlos Ibáñez del Campo": "AI",
  "Región de Magallanes y de la Antártica Chilena": "MA",
};

/**
 * Devuelve las opciones de despacho disponibles para el destino.
 * Vacío = sin cobertura (el checkout ofrecerá solo retiro o "contáctanos").
 */
export async function getShippingOptions(
  ctx: Context,
): Promise<ShippingOption[]> {
  const enviaProvider = new EnviaProvider();
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
  if (!enviaProvider.isConfigured()) {
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
  }

  // Envia requiere una dirección suficiente para devolver valores reales.
  // Si falta o el proveedor falla, se conservan únicamente las tarifas locales.
  const state = REGION_CODES[ctx.region];
  if (
    state &&
    ctx.postalCode &&
    ctx.street &&
    ctx.number &&
    ctx.customerPhone &&
    ctx.packages?.length
  ) {
    try {
      const quotes = await enviaProvider.quote({
        destination: {
          name: ctx.customerName || "Cliente TG LAB",
          email: ctx.customerEmail,
          phone: ctx.customerPhone,
          street: ctx.street,
          number: ctx.number,
          city: ctx.comuna,
          state,
          postalCode: ctx.postalCode,
          reference: ctx.addressNotes,
        },
        packages: ctx.packages,
      });
      for (const quote of quotes) {
        options.push({
          rateId: encodeEnviaRateId(quote.carrier, quote.service),
          zoneId: "envia",
          zoneName: quote.carrier,
          name: `${quote.description}${quote.deliveryEstimate ? ` · ${quote.deliveryEstimate}` : ""}`,
          deliveryType: "HOME",
          price: quote.price,
          free: quote.price === 0,
        });
      }
    } catch (error) {
      console.error("[envia:quote]", error);
    }
  }

  // Ordena por precio. Para no abrumar al cliente, Envia muestra únicamente
  // la alternativa más económica de cada transportista.
  options.sort((a, b) => a.price - b.price);
  const seen = new Set<string>();
  const seenEnviaCarriers = new Set<string>();
  return options.filter((o) => {
    if (o.zoneId === "envia") {
      const carrier = o.zoneName.toLocaleLowerCase("es-CL");
      if (seenEnviaCarriers.has(carrier)) return false;
      seenEnviaCarriers.add(carrier);
    }
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
    return {
      hasShipping:
        zonesCount > 0 ||
        new EnviaProvider().isConfigured() ||
        new ChilexpressProvider().isConfigured(),
    };
  } catch {
    return {
      hasShipping:
        new EnviaProvider().isConfigured() ||
        new ChilexpressProvider().isConfigured(),
    };
  }
});
