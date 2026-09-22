"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { AccountCopy } from "@/config/account-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createStaff,
  changeAccountAccess,
} from "@/server/actions/access-management-actions";
import { accountEmail, accountPassword } from "@/lib/schemas/account";
import { z } from "zod";

export function AccessToggle({
  id,
  isActive,
  kind,
  copy,
}: {
  id: string;
  isActive: boolean;
  kind: "staff" | "customer";
  copy: AccountCopy;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const result = await changeAccountAccess({
              id,
              isActive: !isActive,
              kind,
            });
            if (result.ok) router.refresh();
            else setError(copy.genericError);
          } catch {
            setError(copy.genericError);
          } finally {
            setBusy(false);
          }
        }}
      >
        {isActive ? copy.suspend : copy.activate}
      </Button>
      {error && (
        <p role="alert" className="text-xs">
          {error}
        </p>
      )}
    </div>
  );
}

export function CreateStaffForm({ copy }: { copy: AccountCopy }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = z
      .object({
        name: z.string().trim().min(2).max(120),
        email: accountEmail,
        password: accountPassword,
        role: z.enum(["owner", "staff"]),
      })
      .safeParse(Object.fromEntries(new FormData(form)));
    if (!input.success) {
      setMessage(copy.invalidForm);
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const result = await createStaff(input.data);
      setMessage(result.ok ? copy.staffCreated : copy.genericError);
      if (result.ok) {
        form.reset();
        router.refresh();
      }
    } catch {
      setMessage(copy.genericError);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="bg-surface rounded-card space-y-4 border p-6"
    >
      <h2 className="font-semibold">{copy.createStaff}</h2>
      {(["name", "email", "password"] as const).map((key) => (
        <div key={key} className="space-y-2">
          <Label htmlFor={`staff-${key}`}>{copy[key]}</Label>
          <Input
            id={`staff-${key}`}
            name={key}
            type={key === "name" ? "text" : key}
            autoComplete={key === "password" ? "new-password" : "off"}
            required
            minLength={key === "password" ? 10 : 2}
            maxLength={key === "password" ? 128 : 160}
          />
        </div>
      ))}
      <div className="space-y-2">
        <Label htmlFor="staff-role">{copy.role}</Label>
        <select
          name="role"
          id="staff-role"
          defaultValue="staff"
          className="bg-background h-10 w-full rounded-md border px-3 text-sm"
        >
          <option value="staff">{copy.staff}</option>
          <option value="owner">{copy.owner}</option>
        </select>
      </div>
      <Button disabled={busy}>{busy ? copy.loading : copy.createStaff}</Button>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </form>
  );
}
