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
    title: "Conoce TG LAB",
    body: [
      "En **TG LAB** creamos productos que combinan **diseño, creatividad y funcionalidad** para darle un toque especial a tus espacios y a tu día a día.",
      "Fabricamos **accesorios gamer, decoración, organizadores, llaveros, lámparas, maceteros y productos personalizados**, cuidando cada detalle del proceso para ofrecer productos con una excelente terminación.",
      "Somos un emprendimiento de **Chiloé**, enfocado en ofrecer productos útiles, decorativos y hechos con dedicación. También contamos con opciones de **personalización**, para adaptar algunos productos a tus gustos o necesidades.",
      "**¿Tienes una idea en mente? Cuéntanos y veamos cómo podemos hacerla realidad.**",
    ],
  },
  contacto: {
    title: "Contacto",
    body: [
      "Estamos aquí para ayudarte con tus productos, pedidos y proyectos personalizados.",
    ],
  },
  "preguntas-frecuentes": {
    title: "Preguntas frecuentes",
    body: ["Aún no se han cargado preguntas frecuentes."],
  },
  terminos: {
    title: "Términos y condiciones",
    body: [
      "**Contacto comercial.** Puedes comunicarte con TG LAB mediante el correo tglab.decor@gmail.com o el teléfono/WhatsApp +56 9 9243 0939.",
      "**Ámbito.** Estas condiciones regulan las compras realizadas en la tienda online de TG LAB en Chile. Antes de pagar, el cliente puede revisar el producto, sus variantes, disponibilidad, precio total, forma de entrega y costo de despacho aplicable.",
      "**Formación de la compra.** El pedido se entiende recibido cuando la plataforma muestra su número y envía la confirmación al correo informado. La compra queda sujeta a la confirmación del pago y disponibilidad. Si excepcionalmente no fuera posible cumplir el pedido, TG LAB contactará al cliente y restituirá los montos pagados que correspondan.",
      "**Precios y pagos.** Los precios se expresan en pesos chilenos e incluyen los impuestos aplicables. Los medios de pago disponibles y cualquier costo de despacho se muestran antes de finalizar la compra. TG LAB no almacena números completos de tarjetas ni sus códigos de seguridad.",
      "**Productos fabricados a pedido.** Cuando un producto requiera fabricación, su ficha debe indicar esa condición y el plazo estimado. Este plazo es distinto del tiempo de transporte. Las líneas de capa propias de la impresión 3D pueden ser visibles y no constituyen por sí solas una falla cuando corresponden al proceso normal, no afectan el uso y coinciden con lo informado en la ficha. Esto no limita la garantía legal ante fallas reales o incumplimiento de lo ofrecido.",
      "**Productos personalizados.** Son aquellos confeccionados especialmente conforme a instrucciones particulares del cliente, como nombres, textos, medidas o diseños específicos. Una variante estándar del catálogo, como un color normalmente ofrecido, no se considera automáticamente personalizada. Cuando legalmente corresponda una excepción al retracto, se informará de manera destacada antes de pagar. Esa excepción nunca elimina la garantía legal.",
      "**Derechos del consumidor.** La garantía legal, el derecho a retracto y las demás protecciones establecidas por la Ley N.º 19.496 se aplican íntegramente. Ninguna disposición de estas condiciones pretende restringir derechos irrenunciables.",
      "**Contacto.** Para consultas sobre una compra, escribe a tglab.decor@gmail.com indicando tu número de pedido. TG LAB utilizará ese mismo correo, y los demás datos de contacto entregados durante la compra, para comunicaciones relacionadas con el pedido.",
    ],
  },
  privacidad: {
    title: "Política de privacidad",
    body: [
      "**Responsable y contacto.** TG LAB trata los datos personales necesarios para operar esta tienda. Para consultas o solicitudes relacionadas con tus datos, escribe a tglab.decor@gmail.com.",
      "**Datos recopilados.** Según la forma en que uses el sitio, podemos almacenar nombre, apellidos, correo, teléfono, RUT, credenciales protegidas de cuenta, direcciones, datos del pedido, notas, favoritos, reseñas, solicitudes personalizadas y archivos que adjuntes. Las sesiones de acceso pueden registrar dirección IP e información del navegador por motivos de seguridad.",
      "**Finalidades.** Usamos estos datos para crear y administrar cuentas, procesar pedidos y pagos, coordinar fabricación, retiro o despacho, emitir comunicaciones transaccionales, atender consultas, prevenir abusos y cumplir obligaciones legales y tributarias.",
      "**Pagos.** TG LAB no almacena números completos de tarjetas ni códigos de seguridad. Cuando se habilitan Mercado Pago o Webpay, los datos necesarios para procesar la transacción son tratados por el proveedor de pago correspondiente bajo sus propias condiciones y políticas.",
      "**Proveedores tecnológicos.** Los datos estrictamente necesarios pueden ser tratados por proveedores de alojamiento, base de datos, almacenamiento, correo y pagos utilizados para operar la tienda. No vendemos datos personales.",
      "**Analítica y tecnologías similares.** El sitio puede habilitar Google Analytics 4 o Meta Pixel únicamente cuando sus identificadores se encuentren configurados. Si se activan tecnologías no esenciales que requieran consentimiento, la tienda deberá solicitarlo antes de utilizarlas.",
      "**Conservación y seguridad.** Conservamos la información durante el tiempo necesario para gestionar la relación comercial, responder solicitudes y cumplir obligaciones legales. Aplicamos medidas razonables de seguridad, aunque ningún sistema conectado a internet puede garantizar riesgo cero.",
      "**Tus solicitudes.** Puedes pedir información, actualización, rectificación, bloqueo o eliminación cuando corresponda conforme a la legislación chilena. Envía tu solicitud a tglab.decor@gmail.com; podremos pedir antecedentes razonables para verificar tu identidad antes de responder.",
    ],
  },
  "cambios-devoluciones": {
    title: "Cambios, devoluciones y garantía legal",
    body: [
      "**Garantía legal.** Si un producto nuevo presenta una falla cubierta por la garantía legal, el consumidor puede ejercer, durante el plazo legal vigente, las opciones de reparación gratuita, cambio o devolución del dinero que correspondan conforme a la Ley N.º 19.496. TG LAB no reduce ni reemplaza esta garantía.",
      "**Cómo solicitarla.** Escribe a tglab.decor@gmail.com, indica el número de pedido y describe el problema. Puedes adjuntar fotografías o videos para facilitar la evaluación inicial. Estos antecedentes ayudan a comprender el caso, pero no se usarán como requisito para eliminar o limitar derechos legales. TG LAB responderá con las instrucciones para continuar.",
      "No se exige conservar el embalaje original para ejercer la garantía legal cuando la ley no lo requiera. La garantía no cubre deterioros imputables al uso contrario a las instrucciones, pero cada caso será revisado según sus circunstancias y la normativa vigente.",
      "**Derecho a retracto.** En compras de productos estándar realizadas por internet, el consumidor puede ejercer el retracto dentro de los 10 días siguientes a la recepción, sujeto a las condiciones y excepciones legales. Para solicitarlo, escribe a tglab.decor@gmail.com indicando tu número de pedido.",
      "Cuando un bien haya sido confeccionado específicamente conforme a instrucciones particulares del cliente, se informará antes de la compra si corresponde legalmente una excepción al retracto. Elegir una variante estándar ofrecida normalmente en el catálogo no convierte por sí solo al producto en personalizado. La eventual exclusión del retracto no afecta la garantía legal por fallas.",
      "**Cambios voluntarios.** Por ahora TG LAB no ofrece una política adicional de cambios por gusto personal, color, tamaño o preferencia más allá del retracto y de los demás derechos establecidos por la ley.",
    ],
  },
  despachos: {
    title: "Despachos y retiro",
    body: [
      "TG LAB realiza despachos únicamente a las zonas habilitadas durante el checkout y ofrece retiro coordinado en Chiloé cuando esa opción se encuentra disponible.",
      "Antes de pagar, el checkout informa las opciones disponibles para la dirección ingresada y su costo. Si no aparece una alternativa de despacho, significa que todavía no existe cobertura configurada para ese destino.",
      "El plazo estimado de fabricación, cuando corresponda, se informa por separado del tiempo de transporte. Una vez despachado, la entrega depende del destino y del transportista seleccionado. TG LAB comunicará los antecedentes de seguimiento disponibles.",
      "Para coordinar un retiro o consultar por una entrega, escribe a tglab.decor@gmail.com o al WhatsApp +56 9 9243 0939 indicando el número de pedido.",
    ],
  },
};

export type AdminInfoPage = {
  slug: string;
  title: string;
  body: string[];
  isPublished: boolean;
  seoTitle: string;
  seoDescription: string;
  exists: boolean;
};

function containsLegacyPlaceholder(content: unknown): boolean {
  if (typeof content === "string") return content.includes("[PLACEHOLDER]");
  return (
    Array.isArray(content) &&
    content.some(
      (paragraph) =>
        typeof paragraph === "string" && paragraph.includes("[PLACEHOLDER]"),
    )
  );
}

/** Contenido tal como está guardado (incluye borradores) para el editor de admin. */
export async function getInfoPageForAdmin(
  slug: string,
): Promise<AdminInfoPage> {
  const fallback = DEFAULTS[slug];

  let row = null;
  try {
    row = await db.page.findUnique({ where: { slug } });
  } catch {
    row = null;
  }

  if (row && !containsLegacyPlaceholder(row.content)) {
    const body = Array.isArray(row.content)
      ? (row.content as unknown[]).map(String)
      : typeof row.content === "string"
        ? [row.content]
        : (fallback?.body ?? []);
    return {
      slug,
      title: row.title,
      body,
      isPublished: row.isPublished,
      seoTitle: row.seoTitle ?? "",
      seoDescription: row.seoDescription ?? "",
      exists: true,
    };
  }

  return {
    slug,
    title: fallback?.title ?? slug,
    body: fallback?.body ?? [],
    isPublished: true,
    seoTitle: "",
    seoDescription: "",
    exists: false,
  };
}

export const getInfoPage = cache(
  async (slug: string): Promise<InfoPageContent | null> => {
    const fallback = DEFAULTS[slug];

    let row = null;
    try {
      row = await db.page.findUnique({ where: { slug } });
    } catch {
      row = null;
    }

    if (
      row &&
      row.isPublished &&
      !containsLegacyPlaceholder(row.content)
    ) {
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
