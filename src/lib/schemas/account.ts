import { z } from "zod";
import { isValidLocation } from "@/data/cl-regions";
import { isValidRut } from "@/lib/rut";

export const accountPassword = z.string().min(10).max(128);
export const accountEmail = z.string().trim().toLowerCase().email().max(160);
export const loginSchema = z.object({
  email: accountEmail,
  password: z.string().min(1).max(128),
  rememberMe: z.boolean(),
});
export const registrationSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: accountEmail,
    password: accountPassword,
    confirmPassword: z.string(),
    terms: z.literal(true),
  })
  .refine((v) => v.password === v.confirmPassword);
export const resetPasswordSchema = z
  .object({
    password: accountPassword,
    confirmPassword: z.string(),
    token: z.string().min(1).max(512),
  })
  .refine((v) => v.password === v.confirmPassword);
export const profileSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  phone: z
    .string()
    .trim()
    .max(20)
    .refine((v) => !v || /^[0-9+\s()-]{7,20}$/.test(v)),
  rut: z
    .string()
    .trim()
    .max(16)
    .refine((v) => !v || isValidRut(v)),
});
export const addressSchema = z
  .object({
    id: z.string().cuid().optional(),
    fullName: z.string().trim().min(1).max(120),
    phone: z
      .string()
      .trim()
      .regex(/^[0-9+\s()-]{7,20}$/),
    region: z.string().min(1).max(80),
    comuna: z.string().min(1).max(80),
    street: z.string().trim().min(1).max(120),
    number: z.string().trim().min(1).max(20),
    apartment: z.string().trim().max(40),
    notes: z.string().trim().max(400),
    isDefault: z.boolean(),
  })
  .refine((v) => isValidLocation(v.region, v.comuna));

/** Solo permite destinos locales conocidos, nunca URLs externas ni scripts. */
export function safeAuthRedirect(
  value: string | null | undefined,
  staff = false,
) {
  const fallback = staff ? "/admin" : "/cuenta";
  if (!value || /[\\\s\x00-\x1f]/.test(value) || value.includes("%"))
    return fallback;
  if (staff)
    return /^\/admin(?:\/(?!login|recuperar|restablecer)[a-z0-9/_-]*)?(?:\?[^#]*)?$/.test(
      value,
    )
      ? value
      : fallback;
  return /^\/(?:cuenta(?:\/(?!login|registro|recuperar|restablecer)[a-z0-9/_-]*)?|checkout|carrito)(?:\?[^#]*)?$/.test(
    value,
  )
    ? value
    : fallback;
}
