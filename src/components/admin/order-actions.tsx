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
import { confirmBankTransfer } from "@/server/actions/payment-actions";
import {
  cancelOrder,
  changeOrderStatus,
  markOrderRefunded,
  recordManualBoleta,
  updateOrderTracking,
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
  document: { id: string; status: string; folio: string } | null;
};

export function OrderActions({ order }: { order: Order }) {
  const router = useRouter();
  const [toStatus, setToStatus] = useState("");
  const [note, setNote] = useState("");
  const [ref, setRef] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [refund, setRefund] = useState({
    amount: "",
    reference: "",
    restock: true,
  });
  const [boleta, setBoleta] = useState({
    folio: order.document?.folio ?? "",
    issuedAt: new Date().toISOString().slice(0, 16),
  });
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
  const cancel = useAction(cancelOrder, {
    successMessage: "Pedido cancelado",
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

  const options = NEXT_STATUS[order.status] ?? [];
  const canCancel =
    order.status !== "CANCELLED" && order.status !== "DELIVERED";
  const canRefund = order.paymentStatus === "PAID";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {order.paymentStatus !== "PAID" && (
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

        {options.length > 0 && (
          <div className="border-border rounded-md border p-3">
            <p className="mb-2 text-sm font-medium">
              Cambiar estado del pedido
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                className="max-w-[14rem]"
                value={toStatus}
                onChange={(e) => setToStatus(e.target.value)}
              >
                <option value="">Selecciona…</option>
                {options.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              <Input
                className="max-w-xs"
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

        {order.paymentStatus === "PAID" &&
          order.document &&
          order.document.status !== "ISSUED" && (
            <div className="border-border rounded-md border p-3">
              <p className="text-sm font-medium">Registrar boleta del SII</p>
              <p className="text-foreground-muted text-xs">
                Emite primero la boleta en el portal del SII y registra aquí su
                folio. Esta acción no emite el documento automáticamente.
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
                      documentId: order.document!.id,
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
              Anota un reembolso ya hecho por fuera (Mercado Pago /
              transferencia). Opcionalmente repone el stock. No mueve dinero.
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-2">
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
                placeholder="Referencia (opcional)"
                value={refund.reference}
                onChange={(e) =>
                  setRefund({ ...refund, reference: e.target.value })
                }
              />
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={refund.restock}
                  onChange={(e) =>
                    setRefund({ ...refund, restock: e.target.checked })
                  }
                />
                Reponer stock
              </label>
              <ConfirmDialog
                title="Registrar reembolso"
                description="Marca el pedido como reembolsado y (si corresponde) repone el stock."
                confirmLabel="Registrar"
                destructive
                onConfirm={() =>
                  doRefund.run({
                    orderId: order.id,
                    amount: refund.amount,
                    reference: refund.reference || undefined,
                    restock: refund.restock,
                  })
                }
                trigger={
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!refund.amount || doRefund.isPending}
                  >
                    Registrar reembolso
                  </Button>
                }
              />
            </div>
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
              <ConfirmDialog
                title="Cancelar pedido"
                description="Se notifica al cliente por email con el motivo indicado."
                confirmLabel="Cancelar pedido"
                destructive
                onConfirm={() =>
                  cancel.run({ orderId: order.id, reason: cancelReason.trim() })
                }
                trigger={
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={
                      cancelReason.trim().length < 3 || cancel.isPending
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
