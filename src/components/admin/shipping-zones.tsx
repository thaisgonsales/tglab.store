"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CL_REGIONS, comunasOf } from "@/data/cl-regions";
import { formatCLP } from "@/lib/money";
import { useAction } from "@/lib/use-action";
import {
  createZone,
  deleteRate,
  deleteZone,
  saveRate,
  setZoneLocations,
  updateZone,
} from "@/server/actions/shipping-actions";

type Location = { region: string; comuna: string | null };
type Rate = {
  id: string;
  name: string;
  price: number;
  freeOverSubtotal: number | null;
  minWeightGrams: number | null;
  maxWeightGrams: number | null;
  isActive: boolean;
};
type Zone = {
  id: string;
  name: string;
  isActive: boolean;
  locations: Location[];
  rates: Rate[];
};

export function ShippingZones({ zones }: { zones: Zone[] }) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const create = useAction(createZone, {
    successMessage: "Zona creada",
    onSuccess: () => {
      setNewName("");
      router.refresh();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Input
          placeholder="Nombre de la zona (ej: Chile continental)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button
          disabled={newName.trim().length < 2 || create.isPending}
          onClick={() => create.run({ name: newName.trim(), isActive: true })}
        >
          Crear zona
        </Button>
      </div>

      {zones.length === 0 ? (
        <p className="rounded-card border-border text-foreground-muted border border-dashed p-8 text-center text-sm">
          Sin zonas de despacho. Crea una para habilitar el despacho a
          domicilio.
        </p>
      ) : (
        zones.map((zone) => <ZoneCard key={zone.id} zone={zone} />)
      )}
    </div>
  );
}

function ZoneCard({ zone }: { zone: Zone }) {
  const router = useRouter();
  const [name, setName] = useState(zone.name);
  const [isActive, setIsActive] = useState(zone.isActive);

  const update = useAction(
    (input: { name: string; isActive: boolean }) => updateZone(zone.id, input),
    { successMessage: "Zona actualizada", onSuccess: () => router.refresh() },
  );
  const remove = useAction(deleteZone, {
    successMessage: "Zona eliminada",
    onSuccess: () => router.refresh(),
  });

  return (
    <div className="rounded-card border-border bg-surface border p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="max-w-xs"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={isActive} onCheckedChange={setIsActive} /> Activa
        </label>
        <Button
          size="sm"
          variant="outline"
          disabled={update.isPending}
          onClick={() => update.run({ name, isActive })}
        >
          Guardar
        </Button>
        <ConfirmDialog
          title={`Eliminar zona "${zone.name}"`}
          description="Se eliminan sus comunas y tarifas."
          confirmLabel="Eliminar"
          destructive
          onConfirm={() => remove.run(zone.id)}
          trigger={
            <Button size="icon" variant="ghost" aria-label="Eliminar zona">
              <Trash2 className="size-4 text-red-600" />
            </Button>
          }
        />
      </div>

      <LocationsEditor zoneId={zone.id} initial={zone.locations} />
      <RatesEditor zoneId={zone.id} rates={zone.rates} />
    </div>
  );
}

function LocationsEditor({
  zoneId,
  initial,
}: {
  zoneId: string;
  initial: Location[];
}) {
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>(initial);
  const [region, setRegion] = useState("");
  const [comuna, setComuna] = useState("");

  const save = useAction(setZoneLocations, {
    successMessage: "Comunas actualizadas",
    onSuccess: () => router.refresh(),
  });

  function add() {
    if (!region) return;
    const entry: Location = { region, comuna: comuna || null };
    if (
      locations.some(
        (l) => l.region === entry.region && l.comuna === entry.comuna,
      )
    )
      return;
    // Si se agrega "toda la región", quita las comunas sueltas de esa región.
    const next = entry.comuna
      ? [...locations, entry]
      : [...locations.filter((l) => l.region !== region), entry];
    setLocations(next);
    setComuna("");
  }

  return (
    <div className="border-border mt-4 border-t pt-4">
      <p className="mb-2 text-sm font-medium">Regiones y comunas cubiertas</p>
      <div className="flex flex-wrap gap-1.5">
        {locations.map((l, i) => (
          <span
            key={`${l.region}-${l.comuna ?? "all"}`}
            className="border-border inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs"
          >
            {l.comuna ?? `Toda la región · ${l.region}`}
            <button
              type="button"
              aria-label="Quitar"
              onClick={() =>
                setLocations(locations.filter((_, idx) => idx !== i))
              }
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        {locations.length === 0 && (
          <span className="text-foreground-muted text-xs">Ninguna todavía</span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div>
          <Label className="text-xs">Región</Label>
          <Select
            className="w-48"
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
              setComuna("");
            }}
          >
            <option value="">Elige…</option>
            {CL_REGIONS.map((r) => (
              <option key={r.name} value={r.name}>
                {r.short}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label className="text-xs">Comuna (opcional)</Label>
          <Select
            className="w-48"
            value={comuna}
            onChange={(e) => setComuna(e.target.value)}
            disabled={!region}
          >
            <option value="">Toda la región</option>
            {comunasOf(region).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <Button size="sm" variant="outline" onClick={add} disabled={!region}>
          <Plus className="size-4" /> Agregar
        </Button>
        <Button
          size="sm"
          disabled={save.isPending}
          onClick={() => save.run({ zoneId, locations })}
        >
          Guardar comunas
        </Button>
      </div>
    </div>
  );
}

function RatesEditor({ zoneId, rates }: { zoneId: string; rates: Rate[] }) {
  const router = useRouter();
  const save = useAction(saveRate, {
    successMessage: "Tarifa guardada",
    onSuccess: () => router.refresh(),
  });
  const remove = useAction(deleteRate, {
    successMessage: "Tarifa eliminada",
    onSuccess: () => router.refresh(),
  });

  const [draft, setDraft] = useState({ name: "", price: "", freeOver: "" });

  return (
    <div className="border-border mt-4 border-t pt-4">
      <p className="mb-2 text-sm font-medium">Tarifas</p>
      {rates.length > 0 && (
        <ul className="mb-3 space-y-1 text-sm">
          {rates.map((r) => (
            <li
              key={r.id}
              className="border-border flex items-center justify-between gap-2 rounded-md border px-3 py-2"
            >
              <span>
                {r.name} — <strong>{formatCLP(r.price)}</strong>
                {r.freeOverSubtotal ? (
                  <span className="text-foreground-muted">
                    {" "}
                    · gratis sobre {formatCLP(r.freeOverSubtotal)}
                  </span>
                ) : null}
                {!r.isActive && (
                  <Badge variant="warning" className="ml-2">
                    inactiva
                  </Badge>
                )}
              </span>
              <ConfirmDialog
                title={`Eliminar tarifa "${r.name}"`}
                confirmLabel="Eliminar"
                destructive
                onConfirm={() => remove.run(r.id)}
                trigger={
                  <Button size="icon" variant="ghost" aria-label="Eliminar">
                    <Trash2 className="size-4 text-red-600" />
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <Label className="text-xs">Nombre</Label>
          <Input
            className="w-40"
            placeholder="Despacho estándar"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs">Precio (CLP)</Label>
          <Input
            className="w-28"
            inputMode="numeric"
            value={draft.price}
            onChange={(e) => setDraft({ ...draft, price: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs">Gratis sobre (opcional)</Label>
          <Input
            className="w-32"
            inputMode="numeric"
            value={draft.freeOver}
            onChange={(e) => setDraft({ ...draft, freeOver: e.target.value })}
          />
        </div>
        <Button
          size="sm"
          disabled={draft.name.trim().length < 2 || save.isPending}
          onClick={() =>
            save
              .run({
                zoneId,
                name: draft.name.trim(),
                price: draft.price || 0,
                freeOverSubtotal: draft.freeOver || null,
                minWeightGrams: null,
                maxWeightGrams: null,
                isActive: true,
              })
              .then((r) => {
                if (r.ok) setDraft({ name: "", price: "", freeOver: "" });
              })
          }
        >
          Agregar tarifa
        </Button>
      </div>
    </div>
  );
}
