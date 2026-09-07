import { z } from "zod";

import { isValidRut } from "@/lib/rut";
import { isValidLocation, REGION_NAMES } from "@/data/cl-regions";

const nonEmpty = (max: number, msg = "Requerido") =>
  z.string().trim().min(1, msg).max(max);

const baseObject = z.object({
  firstName: nonEmpty(60, "Ingresa tu nombre"),
  lastName: nonEmpty(60, "Ingresa tu apellido"),
  rut: z
    .string()
    .trim()
    .refine((v) => isValidRut(v), "RUT inválido"),
  email: z.string().trim().email("Email inválido").max(160),
  phone: nonEmpty(20, "Ingresa un teléfono").regex(
    /^[0-9+\s()-]{7,20}$/,
    "Teléfono inválido",
  ),

  fulfillmentMethod: z.enum(["SHIPPING", "PICKUP"]),

  region: z.string().optional(),
  comuna: z.string().optional(),
  street: z.string().trim().max(120).optional(),
  number: z.string().trim().max(20).optional(),
  apartment: z.string().trim().max(40).optional(),
  postalCode: z.string().trim().max(12).optional(),
  addressNotes: z.string().trim().max(400).optional(),
  shippingRateId: z.string().cuid().optional().or(z.literal("")),

  couponCode: z.string().trim().max(40).optional(),
  customerNote: z.string().trim().max(500).optional(),
  createAccount: z.boolean().default(false),
});

const crossValidate = (
  data: z.infer<typeof baseObject>,
  ctx: z.RefinementCtx,
) => {
  if (data.fulfillmentMethod === "SHIPPING") {
    if (!data.region || !REGION_NAMES.includes(data.region)) {
      ctx.addIssue({
        code: "custom",
        path: ["region"],
        message: "Elige una región",
      });
    }
    if (!data.comuna) {
      ctx.addIssue({
        code: "custom",
        path: ["comuna"],
        message: "Elige una comuna",
      });
    } else if (data.region && !isValidLocation(data.region, data.comuna)) {
      ctx.addIssue({
        code: "custom",
        path: ["comuna"],
        message: "La comuna no corresponde a la región",
      });
    }
    if (!data.street) {
      ctx.addIssue({
        code: "custom",
        path: ["street"],
        message: "Ingresa la calle",
      });
    }
    if (!data.number) {
      ctx.addIssue({
        code: "custom",
        path: ["number"],
        message: "Ingresa el número",
      });
    }
    if (!data.shippingRateId) {
      ctx.addIssue({
        code: "custom",
        path: ["shippingRateId"],
        message: "Elige una opción de despacho",
      });
    }
  }
};

/** Schema del formulario (sin la clave de idempotencia). */
export const checkoutFormSchema = baseObject.superRefine(crossValidate);

/** Schema de la Server Action (incluye la clave de idempotencia). */
export const checkoutSchema = baseObject
  .extend({ idempotencyKey: z.string().uuid() })
  .superRefine(crossValidate);

export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
