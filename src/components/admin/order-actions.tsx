"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/lib/use-action";
import {
  CHANNEL_LABELS,
  labelFor,
  ORDER_STATUS_LABELS,
  REQUEST_STATUS_LABELS,
  REQUEST_TYPE_LABELS,
} from "@/lib/order-labels";
import { confirmBankTransfer } from "@/server/actions/payment-actions";
import {
  cancelOrder,
  cancelUnpaidOrder,
  changeOrderStatus,
  markOrderRefunded,
  recordResolutionRequest,
  decideResolutionRequest,
  recordManualBoleta,
  recordManualCreditNote,
  updateOrderTracking,
  generateShippingLabel,
} from "@/server/actions/order-admin-actions";

// Transiciones "hacia adelante" (la cancelación va por su propia acción).
const NEXT_STATUS: Record<string, string[]> = {
  PENDING_PAYMENT: [],
  PAID: ["PREPARING"],
  PREPARING: ["READY_FOR_PICKUP", "SHIPPED"],
  READY_FOR_PICKUP: ["DELIVERED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

type Order = {
  id: string;
  number: string;
  status: string;
  paymentStatus: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
  internalNotes: string;
  shippingRateId: string;
  shippingLabelUrl: string;
  grandTotal: number;
  shippingTotal: number;
  fulfillmentMethod: "PICKUP" | "SHIPPING";
  refundedTotal: number;
  hasPersonalizedItems: boolean;
  documents: {
    id: string;
    type: string;
    status: string;
    folio: string;
    amount: number | null;
  }[];
  resolutionRequests: {
    id: string;
    type: string;
    status: string;
    channel: string;
    reason: string;
    decisionNote: string;
    consumedAt: string;
  }[];
};

export function OrderActions({ order }: { order: Order }) {
  const router = useRouter();
  const [toStatus, setToStatus] = useState("");
  const [note, setNote] = useState("");
  const [ref, setRef] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelConfirmation, setCancelConfirmation] = useState("");
  const [newRequest, setNewRequest] = useState({
    type: "CANCELLATION" as "CANCELLATION" | "RETURN" | "REFUND",
    channel: "WHATSAPP" as "WHATSAPP" | "EMAIL" | "PHONE" | "OTHER",
    reason: "",
  });
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>(
    {},
  );
  const [refund, setRefund] = useState({
    amount: "",
    reference: "",
    reason: "",
    refundReason: "CHANGE_OF_MIND" as
      "CHANGE_OF_MIND" | "DEFECT_OR_NONCONFORMITY" | "AGREED_EXCEPTION",
    restock: false,
    ownerConfirmation: "",
    deliveryReviewed: false,
    moneyReturned: false,
  });
  const pendingBoleta = order.documents.find(
    (document) => document.type === "BOLETA" && document.status !== "ISSUED",
  );
  const pendingCreditNotes = order.documents.filter(
    (document) =>
      document.type === "NOTA_CREDITO" && document.status !== "ISSUED",
  );
  const [boleta, setBoleta] = useState({
    folio: pendingBoleta?.folio ?? "",
    issuedAt: new Date().toISOString().slice(0, 16),
  });
  const [creditNotes, setCreditNotes] = useState<
    Record<string, { folio: string; issuedAt: string }>
  >(() =>
    Object.fromEntries(
      pendingCreditNotes.map((document) => [
        document.id,
        {
          folio: document.folio,
          issuedAt: new Date().toISOString().slice(0, 16),
        },
      ]),
    ),
  );
  const [tracking, setTracking] = useState({
    carrier: order.carrier,
    trackingNumber: order.trackingNumber,
    trackingUrl: order.trackingUrl,
    internalNotes: order.internalNotes,
  });

  const changeStatus = useAction(changeOrderStatus, {
    successMessage: "Estado actualizado",
    onSuccess: () => {
      setToStatus("");
      setNote("");
      router.refresh();
    },
  });
  const confirmPay = useAction(confirmBankTransfer, {
    successMessage: "Pago confirmado y stock descontado",
    onSuccess: () => router.refresh(),
  });
  const saveTracking = useAction(updateOrderTracking, {
    successMessage: "Guardado",
    onSuccess: () => router.refresh(),
  });
  const generateLabel = useAction(generateShippingLabel, {
    successMessage: "Etiqueta generada y seguimiento guardado",
    onSuccess: () => router.refresh(),
  });
  const cancel = useAction(cancelOrder, {
    successMessage: "Pedido cancelado",
    onSuccess: () => router.refresh(),
  });
  const cancelUnpaid = useAction(cancelUnpaidOrder, {
    successMessage: "Pedido pendiente cancelado y stock liberado",
    onSuccess: () => router.refresh(),
  });
  const doRefund = useAction(markOrderRefunded, {
    successMessage: "Reembolso registrado",
    onSuccess: () => router.refresh(),
  });
  const issueBoleta = useAction(recordManualBoleta, {
    successMessage: "Boleta registrada",
    onSuccess: () => router.refresh(),
  });
  const issueCreditNote = useAction(recordManualCreditNote, {
    successMessage: "Nota de crédito registrada",
    onSuccess: () => router.refresh(),
  });
  const createRequest = useAction(recordResolutionRequest, {
    successMessage: "Solicitud registrada",
    onSuccess: () => router.refresh(),
  });
  const decideRequest = useAction(decideResolutionRequest, {
    successMessage: "Solicitud resuelta",
    onSuccess: () => router.refresh(),
  });

  const options = NEXT_STATUS[order.status] ?? [];
  const recommendedStatus =
    order.status === "PAID"
      ? "PREPARING"
      : order.status === "PREPARING"
        ? order.fulfillmentMethod === "PICKUP"
          ? "READY_FOR_PICKUP"
          : "SHIPPED"
        : order.status === "READY_FOR_PICKUP" || order.status === "SHIPPED"
          ? "DELIVERED"
          : "";
  const recommendedAction =
    recommendedStatus === "PREPARING"
      ? "Comenzar a preparar"
      : recommendedStatus === "READY_FOR_PICKUP"
        ? "Marcar listo para retirar"
        : recommendedStatus === "SHIPPED"
          ? "Marcar como despachado"
          : recommendedStatus === "DELIVERED"
            ? "Marcar como entregado"
            : "";
  const canCancel =
    order.status !== "CANCELLED" && order.status !== "DELIVERED";
  const isUnpaidPending =
    order.status === "PENDING_PAYMENT" && order.paymentStatus !== "PAID";
  const refundableTotal = Math.max(0, order.grandTotal - order.refundedTotal);
  const canRefund = order.paymentStatus === "PAID" && refundableTotal > 0;
  const refundAmount = Number(refund.amount);
  const mayRestockAll =
    order.refundedTotal === 0 && refundAmount === order.grandTotal;
  const approvedCancellation = order.resolutionRequests.find(
    (request) =>
      request.type === "CANCELLATION" &&
      request.status === "APPROVED" &&
      !request.consumedAt,
  );
  const approvedRefund = order.resolutionRequests.find(
    (request) =>
      ["RETURN", "REFUND"].includes(request.type) &&
      request.status === "APPROVED" &&
      !request.consumedAt,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestionar pedido</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {recommendedStatus && (
          <div className="border-brand/30 bg-brand/5 rounded-xl border p-4">
            <p className="text-foreground-muted text-xs font-medium tracking-wide uppercase">
              Siguiente paso
            </p>
            <p className="mt-1 font-semibold">{recommendedAction}</p>
            <p className="text-foreground-muted mt-1 text-sm">
              Estado actual: {labelFor(ORDER_STATUS_LABELS, order.status)}.
            </p>
            <Button
              className="mt-3 w-full sm:w-auto"
              disabled={changeStatus.isPending}
              onClick={() =>
                changeStatus.run({
                  orderId: order.id,
                  toStatus: recommendedStatus,
                })
              }
            >
              {recommendedAction}
            </Button>
          </div>
        )}
        {order.shippingRateId.startsWith("envia:") &&
          order.paymentStatus === "PAID" && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
              <p className="text-sm font-medium text-blue-950">
                Envío mediante Envia.com
              </p>
              {order.shippingLabelUrl ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <a
                      href={order.shippingLabelUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Descargar etiqueta PDF
                    </a>
                  </Button>
                  <span className="self-center text-xs text-blue-900">
                    Seguimiento: {order.trackingNumber}
                  </span>
                </div>
              ) : (
                <>
                  <p className="mt-1 text-xs text-blue-900">
                    Revisa productos, dirección y pago. Esta acción compra una
                    guía y no se ejecuta automáticamente.
                  </p>
                  <ConfirmDialog
                    title="Generar y comprar etiqueta"
                    description="Envia.com puede descontar el valor de la guía. Confirma que revisaste este pedido pagado y su dirección."
                    confirmLabel="Generar etiqueta"
                    onConfirm={() => generateLabel.run({ orderId: order.id })}
                    trigger={
                      <Button
                        className="mt-2"
                        size="sm"
                        disabled={generateLabel.isPending}
                      >
                        Generar envío
                      </Button>
                    }
                  />
                </>
              )}
            </div>
          )}
        <div className="border-border rounded-md border p-3">
          <p className="text-sm font-medium">
            Solicitudes recibidas por atención
          </p>
          <p className="text-foreground-muted text-xs">
            Registra aquí lo que el cliente pidió por WhatsApp, email o
            teléfono. Solo la propietaria puede aprobar o rechazar.
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <Select
              value={newRequest.type}
              onChange={(e) =>
                setNewRequest({
                  ...newRequest,
                  type: e.target.value as typeof newRequest.type,
                })
              }
            >
              <option value="CANCELLATION">Cancelación</option>
              <option value="RETURN">Devolución</option>
              <option value="REFUND">Reembolso</option>
            </Select>
            <Select
              value={newRequest.channel}
              onChange={(e) =>
                setNewRequest({
                  ...newRequest,
                  channel: e.target.value as typeof newRequest.channel,
                })
              }
            >
              <option value="WHATSAPP">WhatsApp</option>
              <option value="EMAIL">Email</option>
              <option value="PHONE">Teléfono</option>
              <option value="OTHER">Otro</option>
            </Select>
            <Input
              placeholder="Motivo informado por el cliente"
              value={newRequest.reason}
              onChange={(e) =>
                setNewRequest({ ...newRequest, reason: e.target.value })
              }
            />
          </div>
          <Button
            className="mt-2"
            size="sm"
            disabled={
              newRequest.reason.trim().length < 3 || createRequest.isPending
            }
            onClick={() =>
              createRequest.run({ orderId: order.id, ...newRequest })
            }
          >
            Registrar solicitud pendiente
          </Button>
          <div className="mt-3 space-y-2">
            {order.resolutionRequests.map((request) => (
              <div
                key={request.id}
                className="bg-surface-muted rounded p-2 text-xs"
              >
                <p className="font-medium">
                  {labelFor(REQUEST_TYPE_LABELS, request.type)} ·{" "}
                  {labelFor(REQUEST_STATUS_LABELS, request.status)} ·{" "}
                  {labelFor(CHANNEL_LABELS, request.channel)}
                </p>
                <p>{request.reason}</p>
                {request.status === "PENDING" && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Input
                      className="max-w-xs"
                      placeholder="Fundamento de la decisión"
                      value={decisionNotes[request.id] ?? ""}
                      onChange={(e) =>
                        setDecisionNotes({
                          ...decisionNotes,
                          [request.id]: e.target.value,
                        })
                      }
                    />
                    <Button
                      size="sm"
                      disabled={
                        (decisionNotes[request.id] ?? "").trim().length < 3
                      }
                      onClick={() =>
                        decideRequest.run({
                          orderId: order.id,
                          requestId: request.id,
                          decision: "APPROVED",
                          note: decisionNotes[request.id] ?? "",
                        })
                      }
                    >
                      Aprobar
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={
                        (decisionNotes[request.id] ?? "").trim().length < 3
                      }
                      onClick={() =>
                        decideRequest.run({
                          orderId: order.id,
                          requestId: request.id,
                          decision: "REJECTED",
                          note: decisionNotes[request.id] ?? "",
                        })
                      }
                    >
                      Rechazar
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        {order.paymentStatus === "PENDING" && (
          <div className="border-border rounded-md border p-3">
            <p className="text-sm font-medium">
              Confirmar pago por transferencia
            </p>
            <p className="text-foreground-muted text-xs">
              Úsalo cuando recibas la transferencia. Descuenta el stock
              definitivamente y marca el pedido como pagado.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Input
                className="max-w-xs"
                placeholder="Referencia / comprobante (opcional)"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
              />
              <ConfirmDialog
                title="Confirmar pago"
                description="Se descontará el stock y el pedido pasará a pagado. Esta acción registra la boleta como pendiente."
                confirmLabel="Confirmar pago"
                onConfirm={() =>
                  confirmPay.run({
                    orderNumber: order.number,
                    reference: ref || undefined,
                  })
                }
                trigger={
                  <Button size="sm" disabled={confirmPay.isPending}>
                    Confirmar pago recibido
                  </Button>
                }
              />
            </div>
          </div>
        )}

        {options.length > 1 && (
          <div className="border-border rounded-md border p-3">
            <p className="mb-2 text-sm font-medium">
              Cambiar estado del pedido
            </p>
            <div className="grid gap-2 sm:grid-cols-[14rem_1fr_auto] sm:items-center">
              <Select
                className="w-full"
                value={toStatus}
                onChange={(e) => setToStatus(e.target.value)}
              >
                <option value="">Selecciona…</option>
                {options.map((s) => (
                  <option key={s} value={s}>
                    {labelFor(ORDER_STATUS_LABELS, s)}
                  </option>
                ))}
              </Select>
              <Input
                className="w-full"
                placeholder="Nota (opcional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <Button
                size="sm"
                disabled={!toStatus || changeStatus.isPending}
                onClick={() =>
                  changeStatus.run({
                    orderId: order.id,
                    toStatus: toStatus as
                      | "PENDING_PAYMENT"
                      | "PAID"
                      | "PREPARING"
                      | "READY_FOR_PICKUP"
                      | "SHIPPED"
                      | "DELIVERED"
                      | "CANCELLED",
                    note: note || undefined,
                  })
                }
              >
                Aplicar
              </Button>
            </div>
          </div>
        )}

        {order.paymentStatus === "PAID" && pendingBoleta && (
          <div className="border-border rounded-md border p-3">
            <p className="text-sm font-medium">Registrar boleta del SII</p>
            <p className="text-foreground-muted text-xs">
              Emite primero la boleta en el portal del SII y registra aquí su
              folio. Debe ser por el total del pedido, incluido el despacho:{" "}
              <strong>{formatMoney(order.grandTotal)}</strong>. Esta acción no
              emite el documento automáticamente.
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <div>
                <Label className="text-xs">Folio</Label>
                <Input
                  className="w-40"
                  value={boleta.folio}
                  onChange={(event) =>
                    setBoleta({ ...boleta, folio: event.target.value })
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Fecha de emisión</Label>
                <Input
                  className="w-52"
                  type="datetime-local"
                  value={boleta.issuedAt}
                  onChange={(event) =>
                    setBoleta({ ...boleta, issuedAt: event.target.value })
                  }
                />
              </div>
              <ConfirmDialog
                title="Registrar boleta emitida"
                description="Confirma que la boleta ya fue emitida realmente en el portal del SII."
                confirmLabel="Registrar folio"
                onConfirm={() =>
                  issueBoleta.run({
                    orderId: order.id,
                    documentId: pendingBoleta.id,
                    folio: boleta.folio,
                    issuedAt: boleta.issuedAt,
                  })
                }
                trigger={
                  <Button
                    size="sm"
                    disabled={!boleta.folio.trim() || issueBoleta.isPending}
                  >
                    Registrar boleta
                  </Button>
                }
              />
            </div>
          </div>
        )}

        {pendingCreditNotes.map((document) => {
          const form = creditNotes[document.id] ?? {
            folio: document.folio,
            issuedAt: new Date().toISOString().slice(0, 16),
          };
          return (
            <div
              key={document.id}
              className="rounded-md border border-amber-300 bg-amber-50 p-3"
            >
              <p className="text-sm font-medium text-amber-900">
                Nota de crédito pendiente en el SII
              </p>
              <p className="text-xs text-amber-800">
                Emite una nota de crédito por{" "}
                {formatMoney(document.amount ?? 0)} asociada a la boleta
                original. Luego registra aquí el folio. La tienda no la emite
                automáticamente.
              </p>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <div>
                  <Label className="text-xs">Folio</Label>
                  <Input
                    className="w-40"
                    value={form.folio}
                    onChange={(event) =>
                      setCreditNotes({
                        ...creditNotes,
                        [document.id]: { ...form, folio: event.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Fecha de emisión</Label>
                  <Input
                    className="w-52"
                    type="datetime-local"
                    value={form.issuedAt}
                    onChange={(event) =>
                      setCreditNotes({
                        ...creditNotes,
                        [document.id]: {
                          ...form,
                          issuedAt: event.target.value,
                        },
                      })
                    }
                  />
                </div>
                <ConfirmDialog
                  title="Registrar nota de crédito"
                  description="Confirma que la nota de crédito ya fue emitida realmente en el portal del SII."
                  confirmLabel="Registrar folio"
                  onConfirm={() =>
                    issueCreditNote.run({
                      orderId: order.id,
                      documentId: document.id,
                      folio: form.folio,
                      issuedAt: form.issuedAt,
                    })
                  }
                  trigger={
                    <Button
                      size="sm"
                      disabled={!form.folio.trim() || issueCreditNote.isPending}
                    >
                      Registrar nota de crédito
                    </Button>
                  }
                />
              </div>
            </div>
          );
        })}

        <div className="border-border rounded-md border p-3">
          <p className="mb-2 text-sm font-medium">
            Seguimiento y notas internas
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs">Transportista</Label>
              <Input
                value={tracking.carrier}
                onChange={(e) =>
                  setTracking({ ...tracking, carrier: e.target.value })
                }
              />
            </div>
            <div>
              <Label className="text-xs">N° de seguimiento</Label>
              <Input
                value={tracking.trackingNumber}
                onChange={(e) =>
                  setTracking({ ...tracking, trackingNumber: e.target.value })
                }
              />
            </div>
            <div>
              <Label className="text-xs">URL de seguimiento</Label>
              <Input
                value={tracking.trackingUrl}
                onChange={(e) =>
                  setTracking({ ...tracking, trackingUrl: e.target.value })
                }
              />
            </div>
          </div>
          <div className="mt-3">
            <Label className="text-xs">
              Notas internas (no visibles para el cliente)
            </Label>
            <Textarea
              rows={2}
              value={tracking.internalNotes}
              onChange={(e) =>
                setTracking({ ...tracking, internalNotes: e.target.value })
              }
            />
          </div>
          <Button
            size="sm"
            className="mt-2"
            disabled={saveTracking.isPending}
            onClick={() =>
              saveTracking.run({
                orderId: order.id,
                carrier: tracking.carrier || undefined,
                trackingNumber: tracking.trackingNumber || undefined,
                trackingUrl: tracking.trackingUrl || "",
                internalNotes: tracking.internalNotes || undefined,
              })
            }
          >
            Guardar seguimiento
          </Button>
        </div>

        {canRefund && (
          <div className="border-border rounded-md border p-3">
            <p className="mb-1 text-sm font-medium">Registrar reembolso</p>
            <p className="text-foreground-muted text-xs">
              Primero devuelve realmente el dinero en Mercado Pago o por
              transferencia. Después registra aquí la misma referencia. Esta
              acción no mueve dinero y solo la propietaria puede confirmarla.
              Saldo máximo: {formatMoney(refundableTotal)}.
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <Select
                className="w-64"
                value={refund.refundReason}
                onChange={(event) =>
                  setRefund({
                    ...refund,
                    refundReason: event.target
                      .value as typeof refund.refundReason,
                  })
                }
              >
                <option value="CHANGE_OF_MIND">Cambio de opinión</option>
                <option value="DEFECT_OR_NONCONFORMITY">
                  Falla o no corresponde a lo acordado
                </option>
                <option value="AGREED_EXCEPTION">
                  Excepción comercial autorizada
                </option>
              </Select>
              <Input
                className="w-32"
                inputMode="numeric"
                placeholder="Monto CLP"
                value={refund.amount}
                onChange={(e) =>
                  setRefund({ ...refund, amount: e.target.value })
                }
              />
              <Input
                className="w-40"
                placeholder="Referencia obligatoria"
                value={refund.reference}
                onChange={(e) =>
                  setRefund({ ...refund, reference: e.target.value })
                }
              />
              <Input
                className="min-w-56 flex-1"
                placeholder="Motivo obligatorio"
                value={refund.reason}
                onChange={(e) =>
                  setRefund({ ...refund, reason: e.target.value })
                }
              />
              <Input
                className="w-44"
                placeholder={`Escribe ${order.number}`}
                value={refund.ownerConfirmation}
                onChange={(event) =>
                  setRefund({
                    ...refund,
                    ownerConfirmation: event.target.value,
                  })
                }
              />
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={refund.restock}
                  disabled={!mayRestockAll}
                  onChange={(e) =>
                    setRefund({ ...refund, restock: e.target.checked })
                  }
                />
                Reponer todo el stock
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={refund.deliveryReviewed}
                  onChange={(event) =>
                    setRefund({
                      ...refund,
                      deliveryReviewed: event.target.checked,
                    })
                  }
                />
                Revisé entrega y seguimiento
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={refund.moneyReturned}
                  onChange={(event) =>
                    setRefund({
                      ...refund,
                      moneyReturned: event.target.checked,
                    })
                  }
                />
                El dinero ya fue devuelto realmente
              </label>
              <ConfirmDialog
                title="Registrar reembolso"
                description="Confirma que el dinero ya fue devuelto fuera de la tienda. El registro no ejecuta el pago."
                confirmLabel="Registrar"
                destructive
                onConfirm={() =>
                  doRefund.run({
                    orderId: order.id,
                    requestId: approvedRefund!.id,
                    amount: refund.amount,
                    reference: refund.reference,
                    restock: refund.restock,
                    reason: refund.reason,
                    refundReason: refund.refundReason,
                    ownerConfirmation: refund.ownerConfirmation,
                    deliveryReviewed: true,
                    moneyReturned: true,
                  })
                }
                trigger={
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      !Number.isInteger(refundAmount) ||
                      refundAmount < 1 ||
                      refundAmount > refundableTotal ||
                      refund.reference.trim().length < 3 ||
                      refund.reason.trim().length < 3 ||
                      refund.ownerConfirmation.trim().toUpperCase() !==
                        order.number.toUpperCase() ||
                      !refund.deliveryReviewed ||
                      !refund.moneyReturned ||
                      !approvedRefund ||
                      (order.hasPersonalizedItems &&
                        refund.refundReason === "CHANGE_OF_MIND") ||
                      doRefund.isPending
                    }
                  >
                    Registrar reembolso
                  </Button>
                }
              />
            </div>
            {order.hasPersonalizedItems &&
              refund.refundReason === "CHANGE_OF_MIND" && (
                <p className="mt-2 text-xs font-medium text-amber-700">
                  Bloqueado: el pedido contiene productos personalizados. El
                  retracto por cambio de opinión no corresponde.
                </p>
              )}
          </div>
        )}

        {canCancel && (
          <div className="rounded-md border border-red-200 p-3">
            <p className="mb-1 text-sm font-medium text-red-700">
              Cancelar pedido
            </p>
            <p className="text-foreground-muted text-xs">
              {order.paymentStatus === "PAID"
                ? "El pedido tiene pago recibido: se marca para revisión de reembolso."
                : "Libera la reserva de stock."}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Input
                className="max-w-xs"
                placeholder="Motivo de la cancelación"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
              <Input
                className="max-w-xs"
                placeholder={`Escribe ${order.number} para confirmar`}
                value={cancelConfirmation}
                onChange={(event) => setCancelConfirmation(event.target.value)}
              />
              <ConfirmDialog
                title="Cancelar pedido"
                description={
                  isUnpaidPending
                    ? "El pedido no pagado se cancelará y su reserva de stock quedará liberada. No se enviará correo."
                    : "Se notifica al cliente por email con el motivo indicado."
                }
                confirmLabel="Cancelar pedido"
                destructive
                onConfirm={() => {
                  if (isUnpaidPending) {
                    return cancelUnpaid.run({
                      orderId: order.id,
                      reason: cancelReason.trim(),
                      ownerConfirmation: cancelConfirmation,
                    });
                  }
                  return cancel.run({
                    orderId: order.id,
                    requestId: approvedCancellation!.id,
                    reason: cancelReason.trim(),
                    ownerConfirmation: cancelConfirmation,
                  });
                }}
                trigger={
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={
                      cancelReason.trim().length < 3 ||
                      cancel.isPending ||
                      cancelUnpaid.isPending ||
                      cancelConfirmation.trim().toUpperCase() !==
                        order.number.toUpperCase() ||
                      (!isUnpaidPending && !approvedCancellation)
                    }
                  >
                    Cancelar pedido
                  </Button>
                }
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}
