"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { AccountCopy } from "@/config/account-settings";
import { authClient } from "@/lib/auth-client";
import { customerAuthClient } from "@/lib/customer-auth-client";
import { accountPassword } from "@/lib/schemas/account";
import { formatDateTime } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SessionItem = {
  id: string;
  token: string;
  userAgent?: string | null;
  createdAt: Date | string;
};

export function SecurityPanel({
  copy,
  staff = false,
  currentId,
  twoFactorEnabled = false,
}: {
  copy: AccountCopy;
  staff?: boolean;
  currentId: string;
  twoFactorEnabled?: boolean;
}) {
  const router = useRouter();
  const client = staff ? authClient : customerAuthClient;
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [enabled, setEnabled] = useState(twoFactorEnabled);
  const [setup, setSetup] = useState<{
    totpURI: string;
    backupCodes: string[];
  } | null>(null);

  useEffect(() => {
    let active = true;
    void client
      .listSessions()
      .then((result) => {
        if (!active) return;
        if (result.error) setMessage(copy.genericError);
        else setSessions(result.data ?? []);
      })
      .catch(() => {
        if (active) setMessage(copy.genericError);
      });
    return () => {
      active = false;
    };
  }, [client, copy.genericError]);

  async function run(operation: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await operation();
    } catch {
      setMessage(copy.genericError);
    } finally {
      setBusy(false);
    }
  }
  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const currentPassword = String(data.get("currentPassword") ?? "");
    const newPassword = String(data.get("newPassword") ?? "");
    if (
      !accountPassword.safeParse(newPassword).success ||
      newPassword !== data.get("confirmPassword")
    ) {
      setMessage(copy.invalidForm);
      return;
    }
    await run(async () => {
      const result = await client.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (result.error) throw new Error();
      form.reset();
      setMessage(copy.passwordChanged);
      const next = await client.listSessions();
      setSessions(next.data ?? []);
    });
  }
  async function manageTwoFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    await run(async () => {
      if (setup) {
        const code = String(data.get("code") ?? "");
        if (!/^\d{6}$/.test(code)) throw new Error();
        const result = await authClient.twoFactor.verifyTotp({ code });
        if (result.error) throw new Error();
        setEnabled(true);
        setSetup(null);
        setMessage(copy.twoFactorEnabled);
      } else if (enabled) {
        const result = await authClient.twoFactor.disable({
          password: String(data.get("password") ?? ""),
        });
        if (result.error) throw new Error();
        setEnabled(false);
        setMessage(copy.twoFactorDisabled);
      } else {
        const result = await authClient.twoFactor.enable({
          password: String(data.get("password") ?? ""),
        });
        if (result.error || !result.data || !("totpURI" in result.data))
          throw new Error();
        setSetup(result.data);
      }
      form.reset();
      router.refresh();
    });
  }
  return (
    <div className="space-y-6">
      <form
        onSubmit={changePassword}
        className="bg-surface rounded-card space-y-4 border p-6"
      >
        <h2 className="font-semibold">{copy.changePassword}</h2>
        <p className="text-foreground-muted text-sm">{copy.passwordHint}</p>
        {(["currentPassword", "newPassword", "confirmPassword"] as const).map(
          (key) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={key}>{copy[key]}</Label>
              <Input
                id={key}
                name={key}
                type="password"
                autoComplete={
                  key === "currentPassword"
                    ? "current-password"
                    : "new-password"
                }
                required
                minLength={key === "currentPassword" ? 1 : 10}
                maxLength={128}
              />
            </div>
          ),
        )}
        <Button disabled={busy}>{copy.changePassword}</Button>
      </form>
      {staff && (
        <form
          onSubmit={manageTwoFactor}
          className="bg-surface rounded-card space-y-4 border p-6"
        >
          <h2 className="font-semibold">{copy.twoFactor}</h2>
          <p className="text-foreground-muted text-sm">{copy.twoFactorHint}</p>
          {setup ? (
            <>
              <p className="text-sm">{copy.setup2fa}</p>
              <code className="bg-surface-muted block rounded p-3 break-all">
                {new URL(setup.totpURI).searchParams.get("secret")}
              </code>
              <p className="text-sm font-medium">{copy.backupCodes}</p>
              <ul className="grid grid-cols-2 gap-2 font-mono text-sm">
                {setup.backupCodes.map((code) => (
                  <li key={code}>{code}</li>
                ))}
              </ul>
              <Label htmlFor="totp-code">{copy.code}</Label>
              <Input
                id="totp-code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                pattern="[0-9]{6}"
                maxLength={6}
              />
            </>
          ) : (
            <>
              <Label htmlFor="2fa-password">{copy.currentPassword}</Label>
              <Input
                id="2fa-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={128}
              />
            </>
          )}
          <Button disabled={busy}>
            {setup
              ? copy.verifyCode
              : enabled
                ? copy.disable2fa
                : copy.enable2fa}
          </Button>
        </form>
      )}
      <section className="bg-surface rounded-card space-y-4 border p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">{copy.sessions}</h2>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const result = await client.revokeOtherSessions();
                if (result.error) throw new Error();
                setSessions(sessions.filter((s) => s.id === currentId));
                setMessage(copy.saved);
              })
            }
          >
            {copy.revokeOthers}
          </Button>
        </div>
        {sessions.map((s) => (
          <div
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-3 border-t pt-3"
          >
            <div className="max-w-full min-w-0">
              <p className="text-sm break-words">
                {s.userAgent || copy.unknownDevice}
              </p>
              <p className="text-foreground-muted text-xs">
                {formatDateTime(s.createdAt)}{" "}
                {s.id === currentId && `· ${copy.currentSession}`}
              </p>
            </div>
            {s.id !== currentId && (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const result = await client.revokeSession({
                      token: s.token,
                    });
                    if (result.error) throw new Error();
                    setSessions(sessions.filter((item) => item.id !== s.id));
                  })
                }
              >
                {copy.revoke}
              </Button>
            )}
          </div>
        ))}
      </section>
      {message && (
        <p role="status" className="bg-surface-muted rounded-md p-4 text-sm">
          {message}
        </p>
      )}
    </div>
  );
}
