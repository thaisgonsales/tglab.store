import "server-only";

import { getEnv } from "@/lib/env";
import { db } from "@/server/db";
import {
  decodeEnviaRateId,
  EnviaProvider,
  type EnviaPackage,
} from "@/server/providers/shipping/envia";
import { ActionError } from "@/server/auth/action-guard";

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

type AddressSnapshot = {
  street?: string;
  number?: string;
  apartment?: string | null;
  postalCode?: string | null;
  notes?: string | null;
};

export async function generateEnviaLabel(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) throw new ActionError("Pedido no encontrado.");
  if (order.paymentStatus !== "PAID") {
    throw new ActionError("La etiqueta solo se genera para pedidos pagados.");
  }
  if (order.fulfillmentMethod !== "SHIPPING") {
    throw new ActionError("Este pedido es para retiro, no para despacho.");
  }
  if (order.shippingLabelUrl || order.trackingNumber) {
    throw new ActionError("Este pedido ya tiene una etiqueta o seguimiento.");
  }
  const selected = order.shippingRateId
    ? decodeEnviaRateId(order.shippingRateId)
    : null;
  if (!selected) {
    throw new ActionError("El pedido no fue cotizado mediante Envia.com.");
  }
  const address = order.shippingAddress as AddressSnapshot | null;
  const state = order.region ? REGION_CODES[order.region] : undefined;
  if (
    !address?.street ||
    !address.number ||
    !address.postalCode ||
    !order.comuna ||
    !state
  ) {
    throw new ActionError("La dirección del pedido está incompleta.");
  }

  const env = getEnv();
  const totalWeight = order.items.reduce(
    (sum, item) =>
      sum + (item.packageWeightGrams ?? 0) * item.quantity,
    env.ENVIA_PACKAGING_WEIGHT_GRAMS,
  );
  const length = Math.max(
    env.ENVIA_DEFAULT_PACKAGE_LENGTH_CM,
    ...order.items.map((item) => item.packageLengthCm ?? 0),
  );
  const width = Math.max(
    env.ENVIA_DEFAULT_PACKAGE_WIDTH_CM,
    ...order.items.map((item) => item.packageWidthCm ?? 0),
  );
  const height = Math.max(
    env.ENVIA_DEFAULT_PACKAGE_HEIGHT_CM,
    order.items.reduce(
      (sum, item) =>
        sum +
        (item.packageHeightCm ?? env.ENVIA_DEFAULT_PACKAGE_HEIGHT_CM) *
          item.quantity,
      0,
    ),
  );
  const packages: EnviaPackage[] = [{
    content: "Artículos decorativos impresos en 3D",
    declaredValue: order.subtotal,
    weightKg: Math.max(0.1, totalWeight / 1_000),
    lengthCm: length,
    widthCm: width,
    heightCm: height,
  }];

  // La tarifa pudo cambiar desde el checkout. Revalidamos sin comprar y
  // bloqueamos aumentos para que TG LAB no asuma un cobro sorpresa.
  const provider = new EnviaProvider();
  const destination = {
    name: `${order.firstName} ${order.lastName}`,
    email: order.email,
    phone: order.phone,
    street: address.street,
    number: address.number,
    city: order.comuna,
    state,
    postalCode: address.postalCode,
    reference: [address.apartment, address.notes].filter(Boolean).join(" · "),
  };
  const currentQuote = (await provider.quote({ destination, packages })).find(
    (quote) =>
      quote.carrier === selected.carrier && quote.service === selected.service,
  );
  if (!currentQuote) {
    throw new ActionError(
      "La tarifa seleccionada ya no está disponible. Revisa el pedido antes de generar otra opción.",
    );
  }
  if (
    order.shippingQuotedPrice !== null &&
    currentQuote.price > order.shippingQuotedPrice
  ) {
    throw new ActionError(
      `La guía subió de $${order.shippingQuotedPrice.toLocaleString("es-CL")} a $${currentQuote.price.toLocaleString("es-CL")}. No se compró; revisa el costo.`,
    );
  }

  // Reclamo atómico: dos clics o pestañas concurrentes no pueden comprar dos
  // etiquetas. Un intento fallido libera el reclamo para permitir reintentar.
  const claimed = await db.order.updateMany({
    where: {
      id: order.id,
      shippingLabelRequestedAt: null,
      shippingLabelCreatedAt: null,
    },
    data: { shippingLabelRequestedAt: new Date() },
  });
  if (claimed.count !== 1) {
    throw new ActionError("La etiqueta ya fue generada o está en proceso.");
  }

  try {
    const label = await provider.createLabel({
      destination,
      packages,
      carrier: selected.carrier,
      service: selected.service,
    });

    return await db.order.update({
      where: { id: order.id },
      data: {
        carrier: label.carrier,
        trackingNumber: label.trackingNumber,
        trackingUrl: label.trackingUrl,
        shippingLabelUrl: label.labelUrl,
        shippingShipmentId: label.shipmentId,
        shippingLabelPrice: label.price,
        shippingLabelCreatedAt: new Date(),
      },
    });
  } catch (error) {
    await db.order.update({
      where: { id: order.id },
      data: { shippingLabelRequestedAt: null },
    });
    throw error;
  }
}
