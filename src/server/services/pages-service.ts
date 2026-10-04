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
      "Estos términos explican cómo funcionan las compras realizadas en la tienda online de **TG LAB**. Antes de pagar, puedes revisar el producto, las opciones elegidas, el precio total y las condiciones de entrega.",
      "## 1. Sobre TG LAB",
      "Esta tienda es operada por **TG LAB** en Chile. Si tienes una consulta sobre un producto o un pedido, puedes escribirnos a [**tglab.decor@gmail.com**](mailto:tglab.decor@gmail.com) o contactarnos por WhatsApp al **+56 9 9243 0939**.",
      "## 2. Productos",
      "Vendemos productos de catálogo y productos que pueden configurarse según las opciones indicadas en su ficha. Algunos se fabrican después de recibir el pedido; cuando sea así, informaremos el plazo estimado de preparación antes de la compra.",
      "Nuestros productos impresos en 3D pueden presentar líneas de capa y pequeñas diferencias de textura o tono propias del proceso de fabricación. Las fotografías ayudan a mostrar el producto, pero el color también puede variar ligeramente según la iluminación y la pantalla utilizada. Esto no modifica las características, medidas ni funciones que se informan en cada publicación, ni afecta los derechos del cliente si recibe un producto defectuoso o distinto del ofrecido.",
      "## 3. Productos personalizados",
      "Cuando un producto permita personalización, la ficha mostrará las opciones disponibles, como texto, nombre, colores, diseño o medidas. Antes de pagar, el cliente podrá revisar los datos que ingresó y es responsable de comprobar que estén correctos.",
      "Si necesitas corregir un dato **después de realizar el pedido**, contáctanos cuanto antes. Haremos el cambio si la fabricación aún no ha comenzado y es posible realizarlo. Si ya empezó, te informaremos si la modificación puede hacerse y si implica un costo adicional, antes de continuar.",
      "Los productos elaborados o modificados según instrucciones particulares del cliente pueden estar excluidos del **derecho a retracto por cambio de opinión**. Cuando corresponda esta exclusión, se indicará de forma destacada en la ficha del producto antes del pago. La fabricación posterior al pedido o la elección de una variante estándar del catálogo no convierten por sí solas un producto en personalizado.",
      "## 4. Precios y pagos",
      "Los precios se muestran en **pesos chilenos (CLP)** e incluyen los impuestos aplicables. Antes de confirmar la compra se mostrará el total a pagar, incluidos los costos de despacho que correspondan.",
      "Podemos actualizar los precios y la disponibilidad publicados en la tienda. Los cambios de precio posteriores no modificarán el monto de un pedido ya confirmado. Los pagos se realizan mediante los medios habilitados en el sitio.",
      "## 5. Confirmación del pedido",
      "Después de completar la compra, recibirás una confirmación con los datos del pedido en el correo electrónico que indicaste. Si detectas un error en tu dirección de entrega o en las opciones de personalización, escríbenos lo antes posible.",
      "Si excepcionalmente no podemos cumplir un pedido por falta de disponibilidad u otra causa, te contactaremos para ofrecerte una solución o devolver el dinero pagado, según corresponda.",
      "## 6. Preparación y envíos",
      "Realizamos envíos dentro de Chile mediante empresas de transporte. El costo y el plazo o rango de entrega disponible se informarán antes de finalizar la compra. Si un producto requiere fabricación, su plazo de preparación es distinto del tiempo de transporte.",
      "Una vez despachado el pedido, te entregaremos la información de seguimiento disponible. Si existe un retraso, pérdida o daño durante el transporte, contáctanos para revisar lo ocurrido y gestionar una solución conforme a las condiciones ofrecidas y la normativa aplicable.",
      "## 7. Cambios, devoluciones y garantía",
      "Las condiciones para solicitar una devolución por cambio de opinión, los costos de envío de retorno y el procedimiento de reembolso se encuentran en nuestra [**Política de cambios, devoluciones y reembolsos**](/cambios-devoluciones).",
      "Los productos nuevos cuentan con la garantía legal que corresponda. La personalización, las variaciones normales del proceso de impresión 3D o cualquier otra condición de estos términos no eliminan los derechos del cliente cuando existe una falla o el producto no cumple con lo ofrecido.",
      "## 8. Uso del sitio",
      "El sitio debe utilizarse para consultar productos y realizar compras legítimas. No está permitido usarlo para realizar fraudes, suplantar a otra persona o interferir con su funcionamiento. Podremos adoptar medidas frente a un uso indebido, respetando los pedidos ya realizados y los derechos que correspondan.",
      "## 9. Datos personales",
      "Utilizaremos los datos entregados durante la compra para procesar el pago, preparar y entregar el pedido, emitir los documentos correspondientes y comunicarnos contigo sobre la compra. Puedes consultar más detalles en nuestra [**Política de privacidad**](/privacidad).",
      "## 10. Actualizaciones y contacto",
      "Podemos actualizar estos términos cuando sea necesario. Los cambios se publicarán en esta página y no modificarán retroactivamente las condiciones de compras ya realizadas.",
      "Si tienes alguna pregunta, escríbenos a [**tglab.decor@gmail.com**](mailto:tglab.decor@gmail.com).",
    ],
  },
  privacidad: {
    title: "Política de privacidad",
    body: [
      "En **TG LAB** cuidamos los datos que nos entregas al visitar nuestra página, contactarnos o realizar una compra. Esta política explica qué información utilizamos y cómo puedes solicitar acceso, corrección o eliminación de tus datos.",
      "## 1. Responsable y contacto",
      "TG LAB es responsable del tratamiento de los datos personales recopilados a través de esta tienda online. Para consultas relacionadas con tu privacidad, escríbenos a [**tglab.decor@gmail.com**](mailto:tglab.decor@gmail.com).",
      "## 2. Datos que recopilamos",
      "Según cómo utilices la página, podemos recibir:",
      "- **Datos de contacto y compra:** nombre, correo electrónico, teléfono, dirección de despacho y datos de facturación que proporciones.",
      "- **Datos del pedido:** productos comprados, opciones elegidas, textos o imágenes que envíes para personalizar un producto, monto pagado y estado de la compra.",
      "- **Comunicaciones:** mensajes que nos envíes mediante formularios, correo o nuestros canales de contacto.",
      "- **Datos técnicos:** información necesaria para el funcionamiento y la seguridad del sitio, como dirección IP, tipo de navegador y registros de actividad.",
      "Los pagos se realizan mediante los medios habilitados en la tienda. **TG LAB no solicita ni almacena el número completo de tu tarjeta ni su código de seguridad.**",
      "## 3. Para qué utilizamos tus datos",
      "Utilizamos la información necesaria para:",
      "- Procesar el pago y confirmar tu compra.",
      "- Fabricar o preparar el producto según las opciones que elegiste.",
      "- Coordinar el despacho y entregarte información sobre tu pedido.",
      "- Emitir los documentos tributarios que correspondan.",
      "- Responder consultas y gestionar cambios, devoluciones o garantías.",
      "- Mantener el funcionamiento y la seguridad de la página.",
      "- Cumplir las obligaciones legales aplicables.",
      "Solo enviaremos comunicaciones promocionales cuando hayas aceptado recibirlas o exista otra autorización aplicable. Podrás solicitar que dejemos de enviártelas escribiéndonos al correo indicado en esta política.",
      "## 4. Con quién compartimos información",
      "Compartimos únicamente los datos necesarios con quienes intervienen en el funcionamiento de la tienda y en la atención de tu compra, como proveedores de pago, empresas de despacho, servicios de alojamiento web y correo electrónico.",
      "Por ejemplo, la empresa de transporte necesita tu nombre, dirección y datos de contacto para entregar el pedido. Estos proveedores deben utilizar la información para prestar el servicio correspondiente. También podremos entregar datos cuando una obligación legal lo requiera.",
      "## 5. Cookies y medición",
      "La página puede utilizar cookies necesarias para funciones como mantener el carrito y recordar ciertas preferencias. Si habilitamos herramientas de medición o publicidad que utilicen cookies adicionales, te informaremos sobre ellas y podrás elegir las opciones disponibles mediante el aviso de cookies del sitio.",
      "## 6. Durante cuánto tiempo conservamos los datos",
      "Conservamos los datos durante el tiempo necesario para gestionar la compra, atender solicitudes posteriores y cumplir las obligaciones legales y tributarias aplicables. Después, los eliminaremos o mantendremos solo cuando exista un motivo legal para hacerlo.",
      "Las instrucciones de personalización que nos envíes se utilizarán para preparar tu pedido y atender consultas relacionadas con él.",
      "## 7. Seguridad",
      "Aplicamos medidas destinadas a proteger la información contra accesos no autorizados, pérdida o uso indebido. El acceso a los datos de los pedidos se limita a quienes los necesitan para gestionar la compra y la atención al cliente.",
      "## 8. Tus derechos",
      "Puedes escribir a [**tglab.decor@gmail.com**](mailto:tglab.decor@gmail.com) para consultar qué datos personales mantenemos sobre ti, solicitar la corrección de información incorrecta o pedir su eliminación cuando corresponda. También puedes solicitar que no utilicemos tus datos para comunicaciones comerciales.",
      "Es posible que debamos conservar algunos antecedentes de una compra aunque solicites su eliminación, cuando exista una obligación legal que así lo exija. Te explicaremos la situación al responder tu solicitud.",
      "## 9. Cambios en esta política",
      "Podemos actualizar esta política si cambian las funciones de la tienda, los servicios que utilizamos o la normativa aplicable. La versión vigente estará disponible en esta página.",
      "**Última actualización: 27 de septiembre de 2026.**",
    ],
  },
  "cambios-devoluciones": {
    title: "Política de cambios, devoluciones y reembolsos",
    body: [
      "En **TG LAB** queremos que recibas el producto que elegiste y que sepas cómo solicitar una devolución si cambiaste de opinión o si algo salió mal con tu pedido. Esta política se aplica a las compras realizadas directamente en nuestra página web.",
      "## Devolución por cambio de opinión",
      "Si compraste un **producto estándar del catálogo**, puedes solicitar su devolución dentro de los **10 días corridos siguientes a su recepción**, ejerciendo tu derecho a retracto. No necesitas indicar un motivo.",
      "Para devolver el producto:",
      "- Debe estar completo, con todas las piezas y accesorios incluidos en la compra.",
      "- No debe presentar uso más allá de lo necesario para inspeccionarlo ni daños causados después de la entrega.",
      "- Debe enviarse **bien embalado y protegido** para evitar daños durante el transporte. Puedes usar una caja o embalaje distinto del que recibiste.",
      "En una devolución por cambio de opinión, **el costo del envío del producto de vuelta a TG LAB es de cargo del cliente**. Escríbenos antes de enviarlo para recibir los datos y las instrucciones de devolución.",
      "Una vez que recibamos el producto, comprobaremos que esté completo y revisaremos su estado. Si corresponde, gestionaremos el reembolso. Si el producto se deterioró por una causa atribuible al cliente, el derecho a retracto podría no proceder.",
      "## Productos personalizados",
      "Los productos que elaboramos o modificamos según **instrucciones particulares del cliente** —por ejemplo, con un nombre, texto, imagen, diseño o medida solicitada especialmente— **no están sujetos a retracto ni admiten cancelación o devolución por cambio de opinión**. Antes del pago, el cliente debe revisar sus instrucciones y aceptar expresamente esta condición; la tienda conservará esa aceptación junto al pedido.",
      "Un producto del catálogo no se considera personalizado solo porque se fabrique después de recibir el pedido o porque el cliente elija entre las opciones estándar de color o modelo que ofrecemos.",
      "Si un producto personalizado llega con una falla o no corresponde a las especificaciones acordadas, puedes contactarnos. Tus derechos de garantía siguen vigentes.",
      "## Productos con fallas o errores en el pedido",
      "Si recibiste un producto defectuoso, incompleto, dañado durante el envío o diferente del que compraste, escríbenos a [**tglab.decor@gmail.com**](mailto:tglab.decor@gmail.com) con tu número de pedido y una descripción de lo ocurrido. Si tienes fotografías, puedes adjuntarlas para ayudarnos a resolver el caso más rápido.",
      "Cuando corresponda la **garantía legal**, podrás elegir entre reparación gratuita, cambio o devolución del dinero dentro de los **6 meses siguientes a la entrega**. Coordinaremos contigo la devolución del producto. **Si se confirma una falla o un error atribuible a TG LAB, el envío necesario para resolverlo no tendrá costo para ti.**",
      "La garantía legal no cubre daños causados por un uso indebido, golpes o modificaciones posteriores a la entrega, cuando esas circunstancias sean la causa del problema.",
      "## Reembolsos",
      "Toda solicitud de cancelación, devolución o reembolso será revisada manualmente por TG LAB. Enviar una solicitud no significa que haya sido aprobada y el sitio no devuelve dinero automáticamente. Antes de resolver revisaremos el estado del pedido, la fabricación, la entrega, el seguimiento y la causal informada.",
      "Si corresponde devolver el dinero, te confirmaremos el monto y la forma de pago por correo electrónico. El reembolso podrá realizarse mediante **transferencia bancaria a una cuenta que nos indiques**; solicitaremos los datos necesarios a través del correo asociado a tu pedido.",
      "En los casos de retracto, realizaremos la devolución del dinero **a la mayor brevedad posible y dentro del plazo legal contado desde que nos comuniques tu decisión**. La revisión del producto devuelto no suspende ese plazo.",
      "## ¿Cómo hacer una solicitud?",
      "Escríbenos a [**tglab.decor@gmail.com**](mailto:tglab.decor@gmail.com) indicando tu **número de pedido** y si deseas devolver un producto estándar por cambio de opinión o reportar un problema con tu compra. Te responderemos con los pasos para continuar y, cuando sea necesario enviar el producto, con los datos de devolución.",
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

    if (row && row.isPublished && !containsLegacyPlaceholder(row.content)) {
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
