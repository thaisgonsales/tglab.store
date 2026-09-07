"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  CUSTOM_REQUEST_STATUSES,
  customRequestSchema,
  type CustomRequestInput,
} from "@/lib/schemas/custom-request";
import { rateLimit } from "@/lib/rate-limit";
import { ActionError, staffAction } from "@/server/auth/action-guard";
import type { ActionResult } from "@/server/auth/action-guard";
import { db } from "@/server/db";
import { sendEmail } from "@/server/email/send";
import { getSettingsGroup } from "@/server/services/settings-service";

/** Envío público del formulario de solicitud de producto personalizado. */
export async function submitCustomRequest(
  input: CustomRequestInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = customRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ?? "Revisa los datos del formulario.",
    };
  }
  const data = parsed.data;

  // Honeypot: los bots suelen rellenar campos ocultos.
  if (data.company) {
    return { ok: true, data: { id: "ok" } };
  }

  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    hdrs.get("x-real-ip") ??
    "unknown";
  const limit = rateLimit(`custom-request:${ip}`, {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.ok) {
    return {
      ok: false,
      error: "Ya recibimos varias solicitudes tuyas. Escríbenos directamente.",
    };
  }

  try {
    const desiredDate = data.desiredDate ? new Date(data.desiredDate) : null;

    const request = await db.customRequest.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone || null,
        description: data.description,
        quantity: data.quantity ?? null,
        desiredDate:
          desiredDate && !Number.isNaN(desiredDate.getTime())
            ? desiredDate
            : null,
        notes: data.notes || null,
        status: "NEW",
        files: {
          create: data.files.map((f) => ({
            url: f.url,
            storageKey: f.storageKey,
            mimeType: f.mimeType,
            sizeBytes: f.sizeBytes,
          })),
        },
      },
    });

    const [brand, contact] = await Promise.all([
      getSettingsGroup("brand"),
      getSettingsGroup("contact"),
    ]);

    // Confirmación al cliente.
    await sendEmail({
      to: data.email,
      subject: `Recibimos tu solicitud · ${brand.storeName}`,
      html: `<p>Hola ${escapeHtml(data.name)},</p>
        <p>Recibimos tu solicitud de producto personalizado. La revisaremos y te
        contactaremos con una cotización.</p>
        <p><strong>Enviar esta solicitud no constituye automáticamente una
        compra.</strong></p>
        <p>${escapeHtml(data.description).replace(/\n/g, "<br>")}</p>
        <p>— ${escapeHtml(brand.storeName)}</p>`,
      text: `Hola ${data.name}, recibimos tu solicitud de producto personalizado. Te contactaremos con una cotización. Enviar esta solicitud no constituye automáticamente una compra.`,
    });

    // Aviso interno.
    if (contact.email) {
      await sendEmail({
        to: contact.email,
        subject: `Nueva solicitud personalizada de ${data.name}`,
        html: `<p><strong>${escapeHtml(data.name)}</strong> (${escapeHtml(
          data.email,
        )}${data.phone ? `, ${escapeHtml(data.phone)}` : ""})</p>
          <p>${escapeHtml(data.description).replace(/\n/g, "<br>")}</p>
          ${data.quantity ? `<p>Cantidad: ${data.quantity}</p>` : ""}
          <p>Revisar en el panel: /admin/personalizados</p>`,
        text: `Nueva solicitud de ${data.name} (${data.email}). Revisa /admin/personalizados`,
      });
    }

    revalidatePath("/admin/personalizados");
    return { ok: true, data: { id: request.id } };
  } catch (err) {
    console.error("[submitCustomRequest]", err);
    return {
      ok: false,
      error: "No se pudo enviar la solicitud. Intenta nuevamente.",
    };
  }
}

const statusSchema = z.object({
  id: z.string().cuid(),
  status: z.enum(CUSTOM_REQUEST_STATUSES),
  internalNotes: z.string().trim().max(4000).optional(),
});

export async function updateCustomRequest(input: z.infer<typeof statusSchema>) {
  return staffAction(async () => {
    const data = statusSchema.parse(input);
    const existing = await db.customRequest.findUnique({
      where: { id: data.id },
    });
    if (!existing) throw new ActionError("La solicitud no existe.");
    await db.customRequest.update({
      where: { id: data.id },
      data: {
        status: data.status,
        internalNotes: data.internalNotes ?? existing.internalNotes,
      },
    });
    revalidatePath("/admin/personalizados");
    revalidatePath(`/admin/personalizados/${data.id}`);
    return null;
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
