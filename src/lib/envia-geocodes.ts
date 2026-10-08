import { z } from "zod";

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

function normalizeLocation(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-CL");
}

/** Extrae únicamente un código inequívoco perteneciente a la comuna pedida. */
export function parseEnviaPostalCode(
  input: unknown,
  city: string,
): string | null {
  const parsed = locationSchema.safeParse(input);
  if (!parsed.success) return null;

  const normalizedCity = normalizeLocation(city);
  const entries = parsed.data.flatMap((location) => location.zip_codes);
  const exact = entries.filter(
    (entry) =>
      entry.locality && normalizeLocation(entry.locality) === normalizedCity,
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
