"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { AccountCopy } from "@/config/account-settings";
import { CL_REGIONS, comunasOf } from "@/data/cl-regions";
import { addressSchema } from "@/lib/schemas/account";
import {
  saveAddress,
  removeAddress,
} from "@/server/actions/customer-account-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SavedAddress = {
  id: string;
  fullName: string | null;
  phone: string | null;
  region: string;
  comuna: string;
  street: string;
  number: string | null;
  apartment: string | null;
  notes: string | null;
  isDefault: boolean;
};
export function AddressBook({
  copy,
  addresses,
}: {
  copy: AccountCopy;
  addresses: SavedAddress[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<SavedAddress | null | undefined>(
    undefined,
  );
  const [region, setRegion] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const data = new FormData(event.currentTarget);
      const input = addressSchema.safeParse({
        ...Object.fromEntries(data),
        id: editing?.id,
        isDefault: data.get("isDefault") === "on",
      });
      if (!input.success) {
        setMessage(copy.invalidData);
        return;
      }
      const result = await saveAddress(input.data);
      setMessage(result.ok ? copy.saved : result.error);
      if (result.ok) {
        setEditing(undefined);
        router.refresh();
      }
    } catch {
      setMessage(copy.genericError);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      {addresses.length === 0 && <p>{copy.emptyAddresses}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {addresses.map((a) => (
          <article
            key={a.id}
            className="bg-surface rounded-card space-y-2 border p-5"
          >
            <h2 className="font-semibold">{a.fullName}</h2>
            {a.isDefault && (
              <span className="text-brand text-xs">{copy.defaultAddress}</span>
            )}
            <p className="text-sm">
              {a.street} {a.number} {a.apartment}
              <br />
              {a.comuna}, {a.region}
              <br />
              {a.phone}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setEditing(a);
                  setRegion(a.region);
                  setMessage("");
                }}
              >
                {copy.edit}
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={async () => {
                  if (!window.confirm(copy.deleteConfirm)) return;
                  setBusy(true);
                  try {
                    const result = await removeAddress(a.id);
                    setMessage(result.ok ? copy.saved : result.error);
                    if (result.ok) router.refresh();
                  } catch {
                    setMessage(copy.genericError);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {copy.delete}
              </Button>
            </div>
          </article>
        ))}
      </div>
      {editing === undefined ? (
        <Button
          onClick={() => {
            setEditing(null);
            setRegion("");
            setMessage("");
          }}
        >
          {copy.addAddress}
        </Button>
      ) : (
        <form
          key={editing?.id ?? "new"}
          onSubmit={submit}
          className="bg-surface rounded-card grid gap-4 border p-6 sm:grid-cols-2"
        >
          {(["fullName", "phone"] as const).map((key) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`address-${key}`}>
                {key === "fullName" ? copy.name : copy.phone}
              </Label>
              <Input
                id={`address-${key}`}
                name={key}
                defaultValue={editing?.[key] ?? ""}
                required
                maxLength={key === "fullName" ? 120 : 20}
              />
            </div>
          ))}
          <div className="space-y-2">
            <Label htmlFor="address-region">{copy.region}</Label>
            <select
              id="address-region"
              name="region"
              required
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="bg-background h-10 w-full rounded-md border px-3 text-sm"
            >
              <option value="">—</option>
              {CL_REGIONS.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address-comuna">{copy.comuna}</Label>
            <select
              key={region}
              id="address-comuna"
              name="comuna"
              required
              defaultValue={editing?.region === region ? editing.comuna : ""}
              className="bg-background h-10 w-full rounded-md border px-3 text-sm"
            >
              <option value="">—</option>
              {comunasOf(region).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {(["street", "number", "apartment", "notes"] as const).map((key) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`address-${key}`}>{copy[key]}</Label>
              <Input
                id={`address-${key}`}
                name={key}
                defaultValue={editing?.[key] ?? ""}
                required={key === "street" || key === "number"}
                maxLength={
                  key === "street"
                    ? 120
                    : key === "number"
                      ? 20
                      : key === "apartment"
                        ? 40
                        : 400
                }
              />
            </div>
          ))}
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              name="isDefault"
              type="checkbox"
              defaultChecked={editing?.isDefault ?? addresses.length === 0}
            />
            {copy.defaultAddress}
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <Button disabled={busy}>{busy ? copy.loading : copy.submit}</Button>
            <Button
              variant="outline"
              type="button"
              disabled={busy}
              onClick={() => setEditing(undefined)}
            >
              {copy.cancel}
            </Button>
          </div>
        </form>
      )}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </div>
  );
}
