import "server-only";

import { cache } from "react";

import { isChiloeDestination } from "@/lib/shipping-regions";
import { getSettingsGroup } from "@/server/services/settings-service";

/**
 * Modelo de despacho simple para compras nuevas:
 * - Chiloé: tarifa fija cobrada dentro del pedido.
 * - Resto de Chile: transporte por pagar, fuera del total de TG LAB.
 *
 * Los datos de integraciones anteriores se mantienen en pedidos históricos.
 */
export type ShippingOption = {
  rateId: string;
  zoneId: string;
  zoneName: string;
  name: string;
  description?: string;
  deliveryType: "HOME" | "PICKUP_POINT" | "LOCAL_DELIVERY";
  price: number;
  free: boolean;
  paymentTiming: "WITH_ORDER" | "ON_DELIVERY";
};

/** Ya no se consulta un código postal externo para cotizar. */
export async function resolveShippingPostalCode(_comuna?: string): Promise<null> {
  return null;
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
  packages?: unknown[];
};

export async function getShippingOptions(
  ctx: Context,
): Promise<ShippingOption[]> {
  const commerce = await getSettingsGroup("commerce");
  const isChiloe = isChiloeDestination(ctx.region, ctx.comuna);

  if (isChiloe) {
    return [
      {
        rateId: "manual:chiloe",
        zoneId: "chiloe",
        zoneName: "Chiloé",
        name: commerce.chiloeShippingLabel,
        deliveryType: "LOCAL_DELIVERY",
        price: commerce.chiloeShippingPrice,
        free: commerce.chiloeShippingPrice === 0,
        paymentTiming: "WITH_ORDER",
      },
    ];
  }

  return [
    {
      rateId: "manual:payable",
      zoneId: "national-payable",
      zoneName: "Resto de Chile",
      name: commerce.payableShippingLabel,
      description: commerce.payableShippingDescription,
      deliveryType: "HOME",
      price: 0,
      free: false,
      paymentTiming: "ON_DELIVERY",
    },
  ];
}

export async function resolveShippingRate(
  rateId: string,
  ctx: Context,
): Promise<ShippingOption | null> {
  const options = await getShippingOptions(ctx);
  return options.find((option) => option.rateId === rateId) ?? null;
}

export const getFulfillmentConfig = cache(async () => ({ hasShipping: true }));
