"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Settings } from "@/config/settings-schema";
import { useAction } from "@/lib/use-action";
import { saveSettings } from "@/server/actions/settings-actions";
import type { PaymentMethodInfo } from "@/server/payments/types";

export function SettingsForms({
  settings,
  paymentMethods,
}: {
  settings: Settings;
  paymentMethods: PaymentMethodInfo[];
}) {
  return (
    <div className="space-y-6">
      <BrandForm value={settings.brand} />
      <ContactForm value={settings.contact} />
      <CommerceForm value={settings.commerce} />
      <LegalForm value={settings.legal} />
      <PaymentStatusCard methods={paymentMethods} />
    </div>
  );
}

function useSave(group: Parameters<typeof saveSettings>[0]) {
  return useAction((value: unknown) => saveSettings(group, value), {
    successMessage: "Configuración guardada",
  });
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-foreground-muted text-xs">{hint}</p>}
    </div>
  );
}

function BrandForm({ value }: { value: Settings["brand"] }) {
  const [state, setState] = useState(value);
  const save = useSave("brand");
  return (
    <Card>
      <CardHeader>
        <CardTitle>Marca</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Nombre de la tienda">
          <Input
            value={state.storeName}
            onChange={(e) => setState({ ...state, storeName: e.target.value })}
          />
        </Field>
        <Field label="Bajada / tagline">
          <Input
            value={state.tagline}
            onChange={(e) => setState({ ...state, tagline: e.target.value })}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Color primario" hint="#RRGGBB">
            <Input
              value={state.colorPrimary}
              onChange={(e) =>
                setState({ ...state, colorPrimary: e.target.value })
              }
            />
          </Field>
          <Field label="Color de acento">
            <Input
              value={state.colorAccent}
              onChange={(e) =>
                setState({ ...state, colorAccent: e.target.value })
              }
            />
          </Field>
          <Field label="Logo (URL)">
            <Input
              value={state.logoUrl}
              onChange={(e) => setState({ ...state, logoUrl: e.target.value })}
            />
          </Field>
          <Field label="Favicon (URL)">
            <Input
              value={state.faviconUrl}
              onChange={(e) =>
                setState({ ...state, faviconUrl: e.target.value })
              }
            />
          </Field>
        </div>
        <Button
          size="sm"
          disabled={save.isPending}
          onClick={() => save.run(state)}
        >
          Guardar marca
        </Button>
      </CardContent>
    </Card>
  );
}

function ContactForm({ value }: { value: Settings["contact"] }) {
  const [state, setState] = useState(value);
  const save = useSave("contact");
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contacto y redes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email de contacto">
            <Input
              value={state.email}
              onChange={(e) => setState({ ...state, email: e.target.value })}
            />
          </Field>
          <Field label="Teléfono">
            <Input
              value={state.phone}
              onChange={(e) => setState({ ...state, phone: e.target.value })}
            />
          </Field>
          <Field label="WhatsApp" hint="Formato 56912345678 (sin +)">
            <Input
              value={state.whatsapp}
              onChange={(e) => setState({ ...state, whatsapp: e.target.value })}
            />
          </Field>
          <Field label="Instagram (URL)">
            <Input
              value={state.instagram}
              onChange={(e) =>
                setState({ ...state, instagram: e.target.value })
              }
            />
          </Field>
          <Field label="Facebook (URL)">
            <Input
              value={state.facebook}
              onChange={(e) => setState({ ...state, facebook: e.target.value })}
            />
          </Field>
          <Field label="Ciudad / zona">
            <Input
              value={state.city}
              onChange={(e) => setState({ ...state, city: e.target.value })}
            />
          </Field>
        </div>
        <Field
          label="Punto de retiro (texto público)"
          hint="Se muestra en el checkout al elegir retiro. Déjalo vacío para no publicar la dirección."
        >
          <Input
            value={state.addressPublic}
            onChange={(e) =>
              setState({ ...state, addressPublic: e.target.value })
            }
          />
        </Field>
        <Button
          size="sm"
          disabled={save.isPending}
          onClick={() => save.run(state)}
        >
          Guardar contacto
        </Button>
      </CardContent>
    </Card>
  );
}

function CommerceForm({ value }: { value: Settings["commerce"] }) {
  const [state, setState] = useState(value);
  const save = useSave("commerce");
  const bank = state.bankTransferDetails;
  const setBank = (patch: Partial<typeof bank>) =>
    setState({ ...state, bankTransferDetails: { ...bank, ...patch } });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Retiro, stock y transferencia</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-border flex items-center justify-between rounded-md border p-3">
          <span className="text-sm">Habilitar retiro en tienda</span>
          <Switch
            checked={state.pickupEnabled}
            onCheckedChange={(v) => setState({ ...state, pickupEnabled: v })}
          />
        </div>
        <Field label="Instrucciones de retiro">
          <Textarea
            rows={2}
            value={state.pickupInstructions}
            onChange={(e) =>
              setState({ ...state, pickupInstructions: e.target.value })
            }
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Aviso de stock bajo (unidades)">
            <Input
              type="number"
              min={0}
              value={state.lowStockThreshold}
              onChange={(e) =>
                setState({
                  ...state,
                  lowStockThreshold: Number(e.target.value) || 0,
                })
              }
            />
          </Field>
          <Field label="&ldquo;Últimas unidades&rdquo; (unidades)">
            <Input
              type="number"
              min={0}
              value={state.lastUnitsThreshold}
              onChange={(e) =>
                setState({
                  ...state,
                  lastUnitsThreshold: Number(e.target.value) || 0,
                })
              }
            />
          </Field>
        </div>

        <div className="border-border rounded-md border p-3">
          <p className="mb-3 text-sm font-medium">
            Datos para transferencia bancaria
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Titular">
              <Input
                value={bank.accountHolder}
                onChange={(e) => setBank({ accountHolder: e.target.value })}
              />
            </Field>
            <Field label="RUT">
              <Input
                value={bank.rut}
                onChange={(e) => setBank({ rut: e.target.value })}
              />
            </Field>
            <Field label="Banco">
              <Input
                value={bank.bank}
                onChange={(e) => setBank({ bank: e.target.value })}
              />
            </Field>
            <Field label="Tipo de cuenta">
              <Input
                value={bank.accountType}
                onChange={(e) => setBank({ accountType: e.target.value })}
              />
            </Field>
            <Field label="N° de cuenta">
              <Input
                value={bank.accountNumber}
                onChange={(e) => setBank({ accountNumber: e.target.value })}
              />
            </Field>
            <Field label="Email para avisar la transferencia">
              <Input
                value={bank.email}
                onChange={(e) => setBank({ email: e.target.value })}
              />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Instrucciones adicionales">
              <Textarea
                rows={2}
                value={state.bankTransferInstructions}
                onChange={(e) =>
                  setState({
                    ...state,
                    bankTransferInstructions: e.target.value,
                  })
                }
              />
            </Field>
          </div>
        </div>

        <Button
          size="sm"
          disabled={save.isPending}
          onClick={() => save.run(state)}
        >
          Guardar
        </Button>
      </CardContent>
    </Card>
  );
}

function LegalForm({ value }: { value: Settings["legal"] }) {
  const [state, setState] = useState(value);
  const save = useSave("legal");
  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos legales</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Nombre / razón social">
          <Input
            value={state.legalName}
            onChange={(e) => setState({ ...state, legalName: e.target.value })}
          />
        </Field>
        <Field label="RUT">
          <Input
            value={state.legalRut}
            onChange={(e) => setState({ ...state, legalRut: e.target.value })}
          />
        </Field>
        <Field label="Régimen">
          <Input
            value={state.legalRegime}
            onChange={(e) =>
              setState({ ...state, legalRegime: e.target.value })
            }
          />
        </Field>
        <Button
          size="sm"
          disabled={save.isPending}
          onClick={() => save.run(state)}
        >
          Guardar
        </Button>
      </CardContent>
    </Card>
  );
}

function PaymentStatusCard({ methods }: { methods: PaymentMethodInfo[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Medios de pago</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {methods.map((m) => (
          <div
            key={m.key}
            className="border-border flex items-center justify-between rounded-md border p-2"
          >
            <span>{m.label}</span>
            <span
              className={
                m.configured ? "text-emerald-600" : "text-foreground-muted"
              }
            >
              {m.configured ? "Activo" : "Sin configurar"}
            </span>
          </div>
        ))}
        <p className="text-foreground-muted text-xs">
          Mercado Pago / Webpay se activan al cargar sus credenciales en las
          variables de entorno (Fase 8).
        </p>
      </CardContent>
    </Card>
  );
}
