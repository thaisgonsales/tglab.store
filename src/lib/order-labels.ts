export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Pendiente de pago",
  PAID: "Pagado",
  PREPARING: "En preparación",
  READY_FOR_PICKUP: "Listo para retiro",
  SHIPPED: "Despachado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  INITIATED: "Iniciado",
  PENDING: "Pendiente",
  AUTHORIZED: "Autorizado",
  PAID: "Pagado",
  REJECTED: "Rechazado",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
  EXPIRED: "Vencido",
};

export const REQUEST_TYPE_LABELS: Record<string, string> = {
  CANCELLATION: "Cancelación",
  RETURN: "Devolución",
  REFUND: "Reembolso",
};

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
};

export const CHANNEL_LABELS: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  EMAIL: "Correo electrónico",
  PHONE: "Teléfono",
  OTHER: "Otro",
};

export const PAYMENT_PROVIDER_LABELS: Record<string, string> = {
  MERCADOPAGO: "Mercado Pago",
  WEBPAY: "Webpay",
  BANK_TRANSFER: "Transferencia bancaria",
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  BOLETA: "Boleta",
  NOTA_CREDITO: "Nota de crédito",
};

export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  ISSUED: "Emitida",
  FAILED: "Con error",
  CANCELLED: "Cancelada",
};

export function labelFor(labels: Record<string, string>, value: string) {
  return labels[value] ?? value;
}
