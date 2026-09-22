"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { AccountCopy } from "@/config/account-settings";
import { customerAuthClient } from "@/lib/customer-auth-client";
import { profileSchema } from "@/lib/schemas/account";
import {
  saveProfile,
  associateOrders,
} from "@/server/actions/customer-account-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CustomerSignOut({ copy }: { copy: AccountCopy }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <Button
        variant="outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const result = await customerAuthClient.signOut();
            if (result.error) throw new Error();
            router.replace("/cuenta/login");
            router.refresh();
          } catch {
            setError(copy.genericError);
            setBusy(false);
          }
        }}
      >
        {copy.logout}
      </Button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

export function ProfileForm({
  copy,
  profile,
}: {
  copy: AccountCopy;
  profile: {
    firstName: string;
    lastName: string;
    phone: string;
    rut: string;
    name: string;
    email: string;
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const input = profileSchema.safeParse(
        Object.fromEntries(new FormData(event.currentTarget)),
      );
      if (!input.success) {
        setMessage(copy.invalidData);
        return;
      }
      const result = await saveProfile(input.data);
      setMessage(result.ok ? copy.saved : result.error);
      if (result.ok) router.refresh();
    } catch {
      setMessage(copy.genericError);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="bg-surface rounded-card grid gap-4 border p-6 sm:grid-cols-2"
    >
      {(["firstName", "lastName", "phone", "rut"] as const).map((key) => (
        <div className="space-y-2" key={key}>
          <Label htmlFor={key}>{copy[key]}</Label>
          <Input
            id={key}
            name={key}
            defaultValue={
              profile[key] ||
              (key === "firstName"
                ? profile.name.split(" ")[0]
                : key === "lastName"
                  ? profile.name.split(" ").slice(1).join(" ")
                  : "")
            }
            required={key === "firstName" || key === "lastName"}
            maxLength={key === "phone" ? 20 : key === "rut" ? 16 : 60}
            autoComplete={
              key === "firstName"
                ? "given-name"
                : key === "lastName"
                  ? "family-name"
                  : key === "phone"
                    ? "tel"
                    : "off"
            }
          />
        </div>
      ))}
      <div className="sm:col-span-2">
        <Label>{copy.email}</Label>
        <p className="mt-2 text-sm break-all">{profile.email}</p>
      </div>
      {message && (
        <p role="status" className="text-sm sm:col-span-2">
          {message}
        </p>
      )}
      <Button disabled={busy} className="sm:col-span-2">
        {busy ? copy.loading : copy.submit}
      </Button>
    </form>
  );
}

export function EmailVerification({
  copy,
  email,
  verified,
  emailEnabled,
}: {
  copy: AccountCopy;
  email: string;
  verified: boolean;
  emailEnabled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <section className="bg-surface rounded-card space-y-3 border p-6">
      <h2 className="font-semibold">
        {verified ? copy.verified : copy.unverified}
      </h2>
      <p className="text-foreground-muted text-sm">{copy.verifyHint}</p>
      {!verified && !emailEnabled && (
        <p className="text-sm">{copy.emailUnavailable}</p>
      )}
      <Button
        variant="outline"
        disabled={busy || (!verified && !emailEnabled)}
        onClick={async () => {
          setBusy(true);
          setMessage("");
          try {
            if (verified) {
              const result = await associateOrders();
              setMessage(result.ok ? copy.claimed : result.error);
              if (result.ok) router.refresh();
            } else {
              const result = await customerAuthClient.sendVerificationEmail({
                email,
                callbackURL: "/cuenta",
              });
              setMessage(result.error ? copy.genericError : copy.verifySent);
            }
          } catch {
            setMessage(copy.genericError);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? copy.loading : verified ? copy.claimOrders : copy.verify}
      </Button>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
