"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { startPayment } from "@/server/actions/payment-actions";
import type { PaymentMethodInfo } from "@/server/payments/types";

type BankDetails = {
  accountHolder: string;
  rut: string;
  bank: string;
  accountType: string;
  accountNumber: string;
  email: string;
  instructions: string;
};

export function PaymentMethods({
  orderNumber,
  methods,
  bankDetails,
}: {
  orderNumber: string;
  methods: PaymentMethodInfo[];
  bankDetails: BankDetails;
}) {
  const [selected, setSelected] = useState<string>(methods[0]?.key ?? "");
  const [pending, setPending] = useState(false);
  const [showBank, setShowBank] = useState(false);

  async function handleContinue() {
    setPending(true);
    const result = await startPayment({
      orderNumber,
      method: selected as PaymentMethodInfo["key"],
    });
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    if (result.data.kind === "redirect") {
      window.location.href = result.data.url;
    } else if (result.data.kind === "instructions") {
      setShowBank(true);
    } else {
      toast.error(result.data.reason);
    }
  }

  const hasBankData = Boolean(bankDetails.accountNumber && bankDetails.bank);

  return (
    <div className="mt-3 space-y-3">
      {methods.map((m) => (
        <label
          key={m.key}
          className={`flex cursor-pointer gap-3 rounded-md border p-3 text-sm ${
            selected === m.key
              ? "border-brand bg-brand/5"
              : "border-border hover:bg-surface-muted"
          }`}
        >
          <input
            type="radio"
            name="payment-method"
            value={m.key}
            checked={selected === m.key}
            onChange={() => {
              setSelected(m.key);
              setShowBank(false);
            }}
            className="mt-0.5"
          />
          <span>
            <span className="block font-medium">{m.label}</span>
            <span className="text-foreground-muted block text-xs">
              {m.description}
            </span>
          </span>
        </label>
      ))}

      {showBank && selected === "BANK_TRANSFER" && (
        <div className="border-border bg-surface-muted rounded-md border p-4 text-sm">
          <p className="font-medium">Datos para la transferencia</p>
          {hasBankData ? (
            <dl className="mt-2 space-y-1">
              <BankRow label="Titular" value={bankDetails.accountHolder} />
              <BankRow label="RUT" value={bankDetails.rut} />
              <BankRow label="Banco" value={bankDetails.bank} />
              <BankRow label="Tipo de cuenta" value={bankDetails.accountType} />
              <BankRow label="N° de cuenta" value={bankDetails.accountNumber} />
              <BankRow label="Email" value={bankDetails.email} />
            </dl>
          ) : (
            <p className="text-foreground-muted mt-2">
              Los datos bancarios aún no están configurados. Escríbenos para
              coordinar el pago de tu pedido {orderNumber}.
            </p>
          )}
          {bankDetails.instructions && (
            <p className="text-foreground-muted mt-3">
              {bankDetails.instructions}
            </p>
          )}
          <p className="text-foreground-muted mt-3 text-xs">
            Indica el número de pedido <strong>{orderNumber}</strong> en el
            comentario de la transferencia. Confirmamos tu pedido apenas
            recibamos el pago.
          </p>
        </div>
      )}

      {!showBank && (
        <Button
          type="button"
          className="w-full"
          size="lg"
          disabled={pending || !selected}
          onClick={handleContinue}
        >
          {pending ? "Procesando…" : "Continuar"}
        </Button>
      )}
    </div>
  );
}

function BankRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-foreground-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
