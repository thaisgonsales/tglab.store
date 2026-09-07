import "server-only";

import { cache } from "react";

import { db } from "@/server/db";

export type InfoPageContent = {
  slug: string;
  title: string;
  /** Texto plano por párrafos (el editor enriquecido llega en fase posterior). */
  body: string[];
  seoTitle?: string;
  seoDescription?: string;
  isPlaceholder: boolean;
};

/** Contenido por defecto mientras no se edite desde /admin. */
const DEFAULTS: Record<string, { title: string; body: string[] }> = {
  nosotros: {
    title: "Nosotros",
    body: [
      "TG LAB es un emprendimiento ubicado en Chiloé, Región de Los Lagos, dedicado a la fabricación de productos mediante impresión 3D: accesorios gamer, decoración, organizadores, llaveros, lámparas, maceteros y piezas personalizadas.",
      "Este contenido es editable desde el panel de administración.",
    ],
  },
  contacto: {
    title: "Contacto",
    body: [
      "Escríbenos por WhatsApp o a nuestro correo. Los datos de contacto se configuran desde el panel de administración.",
    ],
  },
  "preguntas-frecuentes": {
    title: "Preguntas frecuentes",
    body: ["Aún no se han cargado preguntas frecuentes."],
  },
  terminos: {
    title: "Términos y condiciones",
    body: [
      "[PLACEHOLDER] Estos términos deben completarse con la información legal de TG LAB (nombre/RUT, condiciones de venta, plazos) conforme a la Ley N° 19.496 sobre Protección de los Derechos de los Consumidores.",
    ],
  },
  privacidad: {
    title: "Política de privacidad",
    body: [
      "[PLACEHOLDER] Política de tratamiento de datos personales conforme a la normativa chilena vigente. Debe indicar qué datos se recopilan, con qué fin y cómo ejercer derechos.",
    ],
  },
  "cambios-devoluciones": {
    title: "Cambios y devoluciones",
    body: [
      "[PLACEHOLDER] Política de cambios y devoluciones. La Ley del Consumidor contempla la garantía legal; el detalle operativo (plazos, condiciones para productos personalizados) lo define TG LAB.",
    ],
  },
  despachos: {
    title: "Despachos y retiro",
    body: [
      "Realizamos despachos a distintas comunas de Chile y ofrecemos retiro coordinado en Chiloé. Las tarifas y zonas se configuran desde el panel de administración.",
    ],
  },
};

export const getInfoPage = cache(
  async (slug: string): Promise<InfoPageContent | null> => {
    const fallback = DEFAULTS[slug];

    let row = null;
    try {
      row = await db.page.findUnique({ where: { slug } });
    } catch {
      row = null;
    }

    if (row && row.isPublished) {
      const body = Array.isArray(row.content)
        ? (row.content as unknown[]).map(String)
        : typeof row.content === "string"
          ? [row.content]
          : (fallback?.body ?? []);
      return {
        slug,
        title: row.title,
        body,
        seoTitle: row.seoTitle ?? undefined,
        seoDescription: row.seoDescription ?? undefined,
        isPlaceholder: false,
      };
    }

    if (!fallback) return null;
    return {
      slug,
      title: fallback.title,
      body: fallback.body,
      isPlaceholder: true,
    };
  },
);
