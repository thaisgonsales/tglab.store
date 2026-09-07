import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import { formatCLP } from "@/lib/money";

export type OrderEmailKind =
  | "received"
  | "paid"
  | "preparing"
  | "ready_for_pickup"
  | "shipped"
  | "delivered"
  | "cancelled";

export type OrderEmailData = {
  kind: OrderEmailKind;
  storeName: string;
  number: string;
  firstName: string;
  items: {
    name: string;
    variant: string | null;
    quantity: number;
    total: number;
  }[];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  grandTotal: number;
  fulfillmentMethod: "SHIPPING" | "PICKUP";
  shippingAddress: string | null;
  pickupInfo: string | null;
  trackingCarrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  trackingPageUrl: string;
  bankInstructions: string | null;
  cancellationReason: string | null;
};

const HEADINGS: Record<OrderEmailKind, string> = {
  received: "Recibimos tu pedido",
  paid: "¡Pago confirmado!",
  preparing: "Estamos preparando tu pedido",
  ready_for_pickup: "Tu pedido está listo para retiro",
  shipped: "Tu pedido va en camino",
  delivered: "Tu pedido fue entregado",
  cancelled: "Tu pedido fue cancelado",
};

function intro(d: OrderEmailData): string {
  switch (d.kind) {
    case "received":
      return d.bankInstructions
        ? "Guardamos tu pedido. Para confirmarlo necesitamos que completes el pago."
        : "Guardamos tu pedido y te avisaremos cuando se confirme el pago.";
    case "paid":
      return "Recibimos tu pago. Ya estamos organizando la preparación.";
    case "preparing":
      return "Tu pedido entró en preparación. Te avisamos apenas esté despachado o listo para retirar.";
    case "ready_for_pickup":
      return "Puedes pasar a retirar tu pedido.";
    case "shipped":
      return "Tu pedido fue despachado.";
    case "delivered":
      return "¡Gracias por tu compra!";
    case "cancelled":
      return d.cancellationReason
        ? `Tu pedido fue cancelado. Motivo: ${d.cancellationReason}`
        : "Tu pedido fue cancelado.";
  }
}

const text = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#3a2b28",
  margin: "0 0 10px",
};
const muted = { ...text, color: "#8b756b" };

export function OrderEmail(d: OrderEmailData) {
  return (
    <Html lang="es">
      <Head />
      <Preview>{`${HEADINGS[d.kind]} · Pedido ${d.number}`}</Preview>
      <Body
        style={{
          backgroundColor: "#f6efdf",
          fontFamily: "Arial, sans-serif",
          margin: 0,
          padding: "24px 0",
        }}
      >
        <Container
          style={{
            backgroundColor: "#fffdf8",
            borderRadius: "10px",
            maxWidth: "560px",
            margin: "0 auto",
            padding: "28px",
          }}
        >
          <Text
            style={{
              fontSize: "16px",
              fontWeight: "bold",
              color: "#bd527c",
              margin: "0 0 16px",
            }}
          >
            {d.storeName}
          </Text>
          <Heading
            style={{ fontSize: "20px", color: "#3a2b28", margin: "0 0 8px" }}
          >
            {HEADINGS[d.kind]}
          </Heading>
          <Text style={text}>Hola {d.firstName},</Text>
          <Text style={text}>{intro(d)}</Text>

          <Text style={{ ...text, fontWeight: "bold" }}>Pedido {d.number}</Text>

          <Hr style={{ borderColor: "#ece2d2", margin: "16px 0" }} />

          {d.items.map((it, i) => (
            <Text key={i} style={text}>
              {it.quantity} × {it.name}
              {it.variant ? ` (${it.variant})` : ""} — {formatCLP(it.total)}
            </Text>
          ))}

          <Hr style={{ borderColor: "#ece2d2", margin: "16px 0" }} />

          <Text style={muted}>Subtotal: {formatCLP(d.subtotal)}</Text>
          {d.discountTotal > 0 && (
            <Text style={muted}>Descuento: −{formatCLP(d.discountTotal)}</Text>
          )}
          <Text style={muted}>
            {d.fulfillmentMethod === "PICKUP" ? "Retiro" : "Despacho"}:{" "}
            {d.shippingTotal === 0 ? "Gratis" : formatCLP(d.shippingTotal)}
          </Text>
          <Text style={{ ...text, fontWeight: "bold" }}>
            Total: {formatCLP(d.grandTotal)}
          </Text>

          {d.kind === "received" && d.bankInstructions && (
            <>
              <Hr style={{ borderColor: "#ece2d2", margin: "16px 0" }} />
              <Text style={{ ...text, fontWeight: "bold" }}>Cómo pagar</Text>
              <Text style={text}>{d.bankInstructions}</Text>
            </>
          )}

          {d.fulfillmentMethod === "SHIPPING" && d.shippingAddress && (
            <>
              <Hr style={{ borderColor: "#ece2d2", margin: "16px 0" }} />
              <Text style={muted}>Envío a: {d.shippingAddress}</Text>
            </>
          )}
          {d.fulfillmentMethod === "PICKUP" && d.pickupInfo && (
            <>
              <Hr style={{ borderColor: "#ece2d2", margin: "16px 0" }} />
              <Text style={muted}>Retiro: {d.pickupInfo}</Text>
            </>
          )}

          {(d.kind === "shipped" || d.kind === "delivered") &&
            d.trackingNumber && (
              <>
                <Hr style={{ borderColor: "#ece2d2", margin: "16px 0" }} />
                <Text style={text}>
                  Seguimiento: {d.trackingCarrier ?? ""} {d.trackingNumber}
                </Text>
                {d.trackingUrl && (
                  <Text style={text}>
                    <a href={d.trackingUrl} style={{ color: "#bd527c" }}>
                      Ver seguimiento
                    </a>
                  </Text>
                )}
              </>
            )}

          <Hr style={{ borderColor: "#ece2d2", margin: "16px 0" }} />
          <Section>
            <Text style={text}>
              <a
                href={d.trackingPageUrl}
                style={{ color: "#bd527c", fontWeight: "bold" }}
              >
                Ver el estado de tu pedido
              </a>
            </Text>
          </Section>
          <Text style={muted}>
            {d.storeName} — este correo se envió automáticamente, puedes
            responder si tienes dudas.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
