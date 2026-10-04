import "server-only";

import { z } from "zod";

import { getEnv } from "@/lib/env";

const TEST_COVERAGE_URL =
  "http://testservices.wschilexpress.com/georeference/api/v1.0/coverage-areas";
const TEST_RATING_URL =
  "http://testservices.wschilexpress.com/rating/api/v1.0/rates/courier";
const REQUEST_TIMEOUT_MS = 8_000;

const coverageResponseSchema = z.object({
  coverageAreas: z.array(
    z.object({
      countyCode: z.string().trim().min(1),
      countyName: z.string().trim().min(1),
      regionCode: z.string().optional(),
      coverageName: z.string().optional(),
    }),
  ),
  statusCode: z.coerce.number(),
  statusDescription: z.string().optional(),
});

const courierOptionSchema = z.object({
  serviceTypeCode: z.coerce.number().int(),
  serviceDescription: z.string().trim().min(1),
  serviceValue: z.union([z.string(), z.number()]),
  deliveryType: z.coerce.number().optional(),
  conditions: z.string().optional(),
});

const ratingResponseSchema = z.object({
  data: z
    .object({
      courierServiceOptions: z.array(courierOptionSchema).optional(),
      courierServiceOption: z
        .union([courierOptionSchema, z.array(courierOptionSchema)])
        .optional(),
    })
    .passthrough(),
  statusCode: z.coerce.number().optional(),
  statusDescription: z.string().optional(),
});

export type ChilexpressQuote = {
  serviceCode: number;
  description: string;
  price: number;
};

type QuoteInput = {
  destinationComuna: string;
  weightGrams: number;
  declaredWorth: number;
};

let coveragesCache:
  { expiresAt: number; value: Map<string, string> } | undefined;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function subscriptionHeaders(key: string): HeadersInit {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "Ocp-Apim-Subscription-Key": key,
  };
}

async function chilexpressFetch(
  url: string,
  init: RequestInit,
): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Chilexpress respondió HTTP ${response.status}`);
  }
  return response.json();
}

export class ChilexpressProvider {
  isConfigured(): boolean {
    const env = getEnv();
    return Boolean(
      env.CHILEXPRESS_API_ENV === "test" &&
      env.CHILEXPRESS_COVERAGE_API_KEY &&
      env.CHILEXPRESS_RATING_API_KEY,
    );
  }

  async quote(input: QuoteInput): Promise<ChilexpressQuote[]> {
    if (!this.isConfigured()) return [];
    const env = getEnv();
    const coverages = await this.getCoverages();
    const originCountyCode = coverages.get(
      normalize(env.CHILEXPRESS_ORIGIN_COMUNA),
    );
    const destinationCountyCode = coverages.get(
      normalize(input.destinationComuna),
    );
    if (!originCountyCode || !destinationCountyCode) return [];

    const raw = await chilexpressFetch(TEST_RATING_URL, {
      method: "POST",
      headers: subscriptionHeaders(env.CHILEXPRESS_RATING_API_KEY),
      body: JSON.stringify({
        originCountyCode,
        destinationCountyCode,
        package: {
          weight: String(
            Math.max(
              0.1,
              (input.weightGrams + env.CHILEXPRESS_PACKAGING_WEIGHT_GRAMS) /
                1_000,
            ),
          ),
          height: String(env.CHILEXPRESS_PACKAGE_HEIGHT_CM),
          width: String(env.CHILEXPRESS_PACKAGE_WIDTH_CM),
          lenght: String(env.CHILEXPRESS_PACKAGE_LENGTH_CM),
        },
        productType: 3,
        contentType: 1,
        declaredWorth: String(Math.max(1, input.declaredWorth)),
        deliveryTime: 0,
      }),
    });
    const parsed = ratingResponseSchema.parse(raw);
    const candidate =
      parsed.data.courierServiceOptions ??
      parsed.data.courierServiceOption ??
      [];
    const options = Array.isArray(candidate) ? candidate : [candidate];

    return options
      .map((option) => ({
        serviceCode: option.serviceTypeCode,
        description: option.serviceDescription,
        price: Math.round(Number(option.serviceValue)),
      }))
      .filter(
        (option) =>
          Number.isFinite(option.price) &&
          option.price >= 0 &&
          ![8, 14, 15, 16, 43, 44].includes(option.serviceCode),
      );
  }

  private async getCoverages(): Promise<Map<string, string>> {
    if (coveragesCache && coveragesCache.expiresAt > Date.now()) {
      return coveragesCache.value;
    }
    const env = getEnv();
    const url = new URL(TEST_COVERAGE_URL);
    url.searchParams.set("RegionCode", "99");
    url.searchParams.set("type", "1");
    const raw = await chilexpressFetch(url.toString(), {
      method: "GET",
      headers: subscriptionHeaders(env.CHILEXPRESS_COVERAGE_API_KEY),
    });
    const parsed = coverageResponseSchema.parse(raw);
    if (parsed.statusCode !== 0) {
      throw new Error(
        parsed.statusDescription || "Chilexpress no entregó coberturas",
      );
    }
    const value = new Map<string, string>();
    for (const coverage of parsed.coverageAreas) {
      value.set(normalize(coverage.countyName), coverage.countyCode);
      if (coverage.coverageName) {
        value.set(normalize(coverage.coverageName), coverage.countyCode);
      }
    }
    coveragesCache = { expiresAt: Date.now() + 6 * 60 * 60 * 1_000, value };
    return value;
  }
}
