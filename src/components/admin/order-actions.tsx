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
  changeOrderStatus,
  updateOrderTracking,
} from "@/server/actions/order-admin-actions";

const NEXT_STATUS: Record<string, string[]> = {
  PENDING_PAYMENT: ["PAID", "CANCELLED"],
  PAID: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY_FOR_PICKUP", "SHIPPED", "CANCELLED"],
  READY_FOR_PICKUP: ["DELIVERED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
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
};

export function OrderActions({ order }: { order: Order }) {
  const router = useRouter();
  const [toStatus, setToStatus] = useState("");
  const [note, setNote] = useState("");
  const [ref, setRef] = useState("");
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

  const options = NEXT_STATUS[order.status] ?? [];

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
      </CardContent>
    </Card>
  );
}
