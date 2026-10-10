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
  const sections = [
    {
      id: "brand",
      label: "Marca y apariencia",
      help: "Logo, colores y nombre de la tienda",
    },
    {
      id: "home",
      label: "Página de inicio",
      help: "Portada, beneficios y videos",
    },
    { id: "contact", label: "Contacto", help: "WhatsApp, redes y ubicación" },
    {
      id: "commerce",
      label: "Ventas y entrega",
      help: "Retiro, stock y transferencia",
    },
    { id: "legal", label: "Datos legales", help: "Razón social y RUT" },
    {
      id: "payments",
      label: "Medios de pago",
      help: "Estado de las integraciones",
    },
  ] as const;
  const [activeSection, setActiveSection] =
    useState<(typeof sections)[number]["id"]>("brand");

  return (
    <div className="space-y-4">
      <div className="border-border bg-surface rounded-xl border p-3">
        <Label htmlFor="settings-section" className="mb-2 block md:hidden">
          ¿Qué quieres configurar?
        </Label>
        <select
          id="settings-section"
          value={activeSection}
          onChange={(event) =>
            setActiveSection(event.target.value as typeof activeSection)
          }
          className="border-border bg-background h-12 w-full rounded-lg border px-3 text-base md:hidden"
        >
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.label}
            </option>
          ))}
        </select>
        <div className="hidden grid-cols-2 gap-2 md:grid lg:grid-cols-3">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                activeSection === section.id
                  ? "border-brand bg-brand/10 text-foreground"
                  : "border-border hover:bg-surface-muted text-foreground-muted"
              }`}
            >
              <span className="block text-sm font-semibold">
                {section.label}
              </span>
              <span className="mt-0.5 block text-xs">{section.help}</span>
            </button>
          ))}
        </div>
        <p className="text-foreground-muted mt-2 text-xs md:hidden">
          {sections.find((section) => section.id === activeSection)?.help}
        </p>
      </div>

      <p className="text-foreground-muted px-1 text-sm">
        Cada sección se guarda por separado con el botón que aparece al final.
      </p>
      <section hidden={activeSection !== "brand"}>
        <BrandForm value={settings.brand} />
      </section>
      <section hidden={activeSection !== "home"}>
        <HomeForm value={settings.home} />
      </section>
      <section hidden={activeSection !== "contact"}>
        <ContactForm value={settings.contact} />
      </section>
      <section hidden={activeSection !== "commerce"}>
        <CommerceForm value={settings.commerce} />
      </section>
      <section hidden={activeSection !== "legal"}>
        <LegalForm value={settings.legal} />
      </section>
      <section hidden={activeSection !== "payments"}>
        <PaymentStatusCard methods={paymentMethods} />
      </section>
    </div>
  );
}

function HomeForm({ value }: { value: Settings["home"] }) {
  const [state, setState] = useState(value);
  const save = useSave("home");
  return (
    <Card>
      <CardHeader>
        <CardTitle>Portada</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Título principal">
          <Input
            value={state.heroTitle}
            onChange={(e) => setState({ ...state, heroTitle: e.target.value })}
          />
        </Field>
        <Field label="Texto principal">
          <Textarea
            rows={2}
            value={state.heroSubtitle}
            onChange={(e) =>
              setState({ ...state, heroSubtitle: e.target.value })
            }
          />
        </Field>
        <Field label="Frase de confianza">
          <Input
            value={state.heroTrustLine}
            onChange={(e) =>
              setState({ ...state, heroTrustLine: e.target.value })
            }
          />
        </Field>
        <div className="border-border space-y-3 rounded-md border p-4">
          <p className="text-sm font-semibold">Beneficios de la portada</p>
          {state.benefits.map((benefit, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-2">
              <Input
                aria-label={`Título del beneficio ${index + 1}`}
                value={benefit.title}
                onChange={(e) => {
                  const benefits = [...state.benefits];
                  benefits[index] = { ...benefit, title: e.target.value };
                  setState({ ...state, benefits });
                }}
              />
              <Input
                aria-label={`Descripción del beneficio ${index + 1}`}
                value={benefit.text}
                onChange={(e) => {
                  const benefits = [...state.benefits];
                  benefits[index] = { ...benefit, text: e.target.value };
                  setState({ ...state, benefits });
                }}
              />
            </div>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Video de portada (URL)">
            <Input
              value={state.heroBackgroundVideoUrl}
              onChange={(e) =>
                setState({ ...state, heroBackgroundVideoUrl: e.target.value })
              }
            />
          </Field>
          <Field label="Imagen estática del video (URL)">
            <Input
              value={state.heroBackgroundPosterUrl}
              onChange={(e) =>
                setState({ ...state, heroBackgroundPosterUrl: e.target.value })
              }
            />
          </Field>
        </div>
        <div className="border-border space-y-3 rounded-md border p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Videos “Descubre TG LAB”</p>
              <p className="text-foreground-muted text-xs">
                Hasta 3 videos verticales. La sección se oculta si no agregas
                ninguno.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={state.discoveryVideos.length >= 3}
              onClick={() =>
                setState({
                  ...state,
                  discoveryVideos: [
                    ...state.discoveryVideos,
                    { title: "", videoUrl: "", posterUrl: "" },
                  ],
                })
              }
            >
              Agregar video
            </Button>
          </div>
          {state.discoveryVideos.map((video, index) => (
            <div
              key={index}
              className="bg-surface-muted grid gap-2 rounded-md p-3 sm:grid-cols-2"
            >
              <Input
                placeholder="Título"
                value={video.title}
                onChange={(event) => {
                  const discoveryVideos = [...state.discoveryVideos];
                  discoveryVideos[index] = {
                    ...video,
                    title: event.target.value,
                  };
                  setState({ ...state, discoveryVideos });
                }}
              />
              <Input
                placeholder="URL del video"
                value={video.videoUrl}
                onChange={(event) => {
                  const discoveryVideos = [...state.discoveryVideos];
                  discoveryVideos[index] = {
                    ...video,
                    videoUrl: event.target.value,
                  };
                  setState({ ...state, discoveryVideos });
                }}
              />
              <Input
                className="sm:col-span-2"
                placeholder="URL del poster (recomendado)"
                value={video.posterUrl}
                onChange={(event) => {
                  const discoveryVideos = [...state.discoveryVideos];
                  discoveryVideos[index] = {
                    ...video,
                    posterUrl: event.target.value,
                  };
                  setState({ ...state, discoveryVideos });
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  setState({
                    ...state,
                    discoveryVideos: state.discoveryVideos.filter(
                      (_, current) => current !== index,
                    ),
                  })
                }
              >
                Quitar
              </Button>
            </div>
          ))}
        </div>
        <div className="border-border space-y-3 rounded-md border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Testimonios reales</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setState({
                  ...state,
                  testimonials: [
                    ...state.testimonials,
                    { name: "", quote: "", detail: "" },
                  ],
                })
              }
            >
              Agregar
            </Button>
          </div>
          {state.testimonials.length === 0 && (
            <p className="text-foreground-muted text-xs">
              La sección permanece oculta hasta que agregues un testimonio.
            </p>
          )}
          {state.testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-surface-muted grid gap-2 rounded-md p-3 sm:grid-cols-2"
            >
              <Input
                aria-label="Nombre del cliente"
                placeholder="Nombre"
                value={testimonial.name}
                onChange={(e) => {
                  const testimonials = [...state.testimonials];
                  testimonials[index] = {
                    ...testimonial,
                    name: e.target.value,
                  };
                  setState({ ...state, testimonials });
                }}
              />
              <Input
                aria-label="Detalle del cliente"
                placeholder="Detalle opcional"
                value={testimonial.detail}
                onChange={(e) => {
                  const testimonials = [...state.testimonials];
                  testimonials[index] = {
                    ...testimonial,
                    detail: e.target.value,
                  };
                  setState({ ...state, testimonials });
                }}
              />
              <Textarea
                aria-label="Testimonio"
                placeholder="Testimonio"
                className="sm:col-span-2"
                value={testimonial.quote}
                onChange={(e) => {
                  const testimonials = [...state.testimonials];
                  testimonials[index] = {
                    ...testimonial,
                    quote: e.target.value,
                  };
                  setState({ ...state, testimonials });
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  setState({
                    ...state,
                    testimonials: state.testimonials.filter(
                      (_, current) => current !== index,
                    ),
                  })
                }
              >
                Quitar
              </Button>
            </div>
          ))}
        </div>
        <Button
          size="sm"
          disabled={save.isPending}
          onClick={() => save.run(state)}
        >
          Guardar portada
        </Button>
      </CardContent>
    </Card>
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
        <div className="border-border rounded-md border p-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Franja informativa</p>
              <p className="text-foreground-muted text-xs">
                Aparece sobre el menú de la tienda.
              </p>
            </div>
            <Switch
              checked={state.announcementEnabled}
              onCheckedChange={(announcementEnabled) =>
                setState({ ...state, announcementEnabled })
              }
            />
          </div>
          {state.announcementEnabled && (
            <Input
              className="mt-3"
              aria-label="Texto de la franja informativa"
              value={state.announcementText}
              onChange={(e) =>
                setState({ ...state, announcementText: e.target.value })
              }
            />
          )}
        </div>
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
          <Field label="Color de fondo" hint="#RRGGBB">
            <Input
              value={state.colorBackground}
              onChange={(e) =>
                setState({ ...state, colorBackground: e.target.value })
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
