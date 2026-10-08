import "server-only";

import { z } from "zod";

import { getEnv } from "@/lib/env";

const REQUEST_TIMEOUT_MS = 10_000;

const locationSchema = z.array(
  z.object({
    zip_codes: z.array(
      z.object({
        zip_code: z.string(),
        locality: z.string().optional(),
      }),
    ),
  }),
);

const rateSchema = z.object({
  carrier: z.string().trim().min(1),
  service: z.string().trim().min(1),
  serviceDescription: z.string().trim().optional(),
  totalPrice: z.union([z.string(), z.number()]),
  currency: z.string().optional(),
  deliveryEstimate: z.union([z.string(), z.number()]).optional(),
});

const ratesResponseSchema = z.object({ data: z.array(rateSchema).default([]) });
const labelResponseSchema = z.object({
  data: z.array(
    z.object({
      carrier: z.string(),
      service: z.string(),
      shipmentId: z.union([z.string(), z.number()]),
      trackingNumber: z.string().min(1),
      trackUrl: z.string().url(),
      label: z.string().url(),
      totalPrice: z.union([z.string(), z.number()]),
      currency: z.string().optional(),
    }),
  ).min(1),
});

export type EnviaAddress = {
  name: string;
  email?: string;
  phone: string;
  street: string;
  number: string;
  city: string;
  state: string;
  postalCode: string;
  reference?: string;
};

export type EnviaPackage = {
  content: string;
  declaredValue: number;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

export type EnviaQuote = {
  carrier: string;
  service: string;
  description: string;
  price: number;
  currency: string;
  deliveryEstimate?: string;
};

function baseUrl(): string {
  return getEnv().ENVIA_API_ENV === "production"
    ? "https://api.envia.com"
    : "https://api-test.envia.com";
}

function addressPayload(address: EnviaAddress) {
  return {
    name: address.name,
    email: address.email || undefined,
    phone: address.phone,
    phone_code: "CL",
    street: address.street,
    number: address.number,
    city: address.city,
    state: address.state,
    country: "CL",
    postalCode: address.postalCode,
    reference: address.reference || undefined,
  };
}

function packagePayload(pkg: EnviaPackage) {
  return {
    type: "box",
    content: pkg.content,
    amount: 1,
    declaredValue: pkg.declaredValue,
    lengthUnit: "CM",
    weightUnit: "KG",
    weight: pkg.weightKg,
    dimensions: {
      length: pkg.lengthCm,
      width: pkg.widthCm,
      height: pkg.heightCm,
    },
  };
}

async function post(path: string, body: unknown): Promise<unknown> {
  const response = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${getEnv().ENVIA_API_TOKEN}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const raw: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Envia.com respondió HTTP ${response.status}`);
  }
  return raw;
}

export class EnviaProvider {
  isConfigured(): boolean {
    const env = getEnv();
    return Boolean(
      env.ENVIA_API_TOKEN &&
        env.ENVIA_ORIGIN_PHONE &&
        env.ENVIA_ORIGIN_STREET &&
        env.ENVIA_ORIGIN_POSTAL_CODE,
    );
  }

  private origin(): EnviaAddress {
    const env = getEnv();
    return {
      name: env.ENVIA_ORIGIN_NAME,
      email: env.ENVIA_ORIGIN_EMAIL,
      phone: env.ENVIA_ORIGIN_PHONE,
      street: env.ENVIA_ORIGIN_STREET,
      number: env.ENVIA_ORIGIN_NUMBER,
      city: env.ENVIA_ORIGIN_COMUNA,
      state: env.ENVIA_ORIGIN_REGION_CODE,
      postalCode: env.ENVIA_ORIGIN_POSTAL_CODE,
    };
  }

  /**
   * Envia exige código postal para cotizar, pero su API de geocódigos permite
   * obtenerlo desde la comuna sin exponer ese dato técnico en el checkout.
   * Solo aceptamos un resultado inequívoco para no cotizar con un código
   * inventado o perteneciente a otra localidad.
   */
  async locatePostalCode(city: string): Promise<string | null> {
    const response = await fetch(
      `https://geocodes.envia.com/locate/CL/${encodeURIComponent(city)}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 86_400 },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );
    if (!response.ok) return null;

    const parsed = locationSchema.safeParse(await response.json());
    if (!parsed.success) return null;

    const normalizedCity = city
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es-CL");
    const entries = parsed.data.flatMap((location) => location.zip_codes);
    const exact = entries.filter(
      (entry) =>
        entry.locality
          ?.normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLocaleLowerCase("es-CL") === normalizedCity,
    );
    const candidates = exact.length > 0 ? exact : entries;
    const postalCodes = [
      ...new Set(
        candidates
          .map((entry) => entry.zip_code.trim())
          .filter((value) => /^\d{7}$/.test(value)),
      ),
    ];
    return postalCodes.length === 1 ? postalCodes[0]! : null;
  }

  async quote(input: {
    destination: EnviaAddress;
    packages: EnviaPackage[];
  }): Promise<EnviaQuote[]> {
    if (!this.isConfigured()) return [];
    const carriers = getEnv()
      .ENVIA_CARRIERS.split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const results = await Promise.allSettled(
      carriers.map((carrier) =>
        post("/ship/rate/", {
          origin: addressPayload(this.origin()),
          destination: addressPayload(input.destination),
          packages: input.packages.map(packagePayload),
          settings: { currency: "CLP" },
          shipment: { type: 1, carrier },
        }),
      ),
    );

    return results.flatMap((result) => {
      if (result.status === "rejected") {
        console.error("[envia:carrier-quote]", result.reason);
        return [];
      }
      const parsed = ratesResponseSchema.safeParse(result.value);
      if (!parsed.success) return [];
      return parsed.data.data.flatMap((rate) => {
        const price = Math.round(Number(rate.totalPrice));
        if (!Number.isFinite(price) || price < 0) return [];
        return [{
          carrier: rate.carrier,
          service: rate.service,
          description: rate.serviceDescription || rate.service,
          price,
          currency: rate.currency || "CLP",
          deliveryEstimate: rate.deliveryEstimate?.toString(),
        }];
      });
    });
  }

  async createLabel(input: {
    destination: EnviaAddress;
    packages: EnviaPackage[];
    carrier: string;
    service: string;
  }) {
    if (!this.isConfigured()) {
      throw new Error("Envia.com no está configurado");
    }
    const raw = await post("/ship/generate/", {
      origin: addressPayload(this.origin()),
      destination: addressPayload(input.destination),
      packages: input.packages.map(packagePayload),
      settings: {
        currency: "CLP",
        printFormat: "PDF",
        printSize: "STOCK_4X6",
      },
      shipment: {
        type: 1,
        carrier: input.carrier,
        service: input.service,
        reverse_pickup: 0,
        import: 0,
      },
    });
    const generated = labelResponseSchema.parse(raw).data[0]!;
    const price = Math.round(Number(generated.totalPrice));
    if (!Number.isFinite(price) || price < 0) {
      throw new Error("Envia.com devolvió un precio de etiqueta inválido");
    }
    return {
      carrier: generated.carrier,
      service: generated.service,
      shipmentId: String(generated.shipmentId),
      trackingNumber: generated.trackingNumber,
      trackingUrl: generated.trackUrl,
      labelUrl: generated.label,
      price,
      currency: generated.currency || "CLP",
    };
  }
}

export function encodeEnviaRateId(carrier: string, service: string): string {
  return `envia:${encodeURIComponent(carrier)}:${encodeURIComponent(service)}`;
}

export function decodeEnviaRateId(rateId: string) {
  const match = /^envia:([^:]+):([^:]+)$/.exec(rateId);
  if (!match) return null;
  return {
    carrier: decodeURIComponent(match[1]!),
    service: decodeURIComponent(match[2]!),
  };
}
