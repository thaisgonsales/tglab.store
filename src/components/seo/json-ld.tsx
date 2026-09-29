/**
 * Inserta un bloque <script type="application/ld+json"> con datos estructurados.
 * Server component: el JSON se serializa en el servidor.
 */
export async function JsonLd({ data }: { data: Record<string, unknown> }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <script
      nonce={nonce}
      type="application/ld+json"
      // El contenido es JSON generado por nosotros (no entrada de usuario sin escapar).
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
import { headers } from "next/headers";
