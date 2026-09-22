"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AccountCopy } from "@/config/account-settings";
import { authClient } from "@/lib/auth-client";
import { customerAuthClient } from "@/lib/customer-auth-client";
import {
  accountEmail,
  loginSchema,
  registrationSchema,
  resetPasswordSchema,
  safeAuthRedirect,
} from "@/lib/schemas/account";

export type AuthMode = "login" | "register" | "forgot" | "reset";

export function AuthForm({
  copy,
  mode,
  staff = false,
  emailEnabled,
}: {
  copy: AccountCopy;
  mode: AuthMode;
  staff?: boolean;
  emailEnabled: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const root = staff ? "/admin" : "/cuenta";
  const next = safeAuthRedirect(params.get("next"), staff);
  const client = staff ? authClient : customerAuthClient;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [show, setShow] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const [backup, setBackup] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const str = (key: string) => String(data.get(key) ?? "");
    setError("");
    setMessage("");
    setBusy(true);
    try {
      if (twoFactor) {
        const code = str("code").trim();
        if (!code || (!backup && !/^\d{6}$/.test(code))) {
          setError(copy.invalidCode);
          return;
        }
        const result = backup
          ? await authClient.twoFactor.verifyBackupCode({ code })
          : await authClient.twoFactor.verifyTotp({ code });
        if (result.error) {
          setError(copy.invalidCredentials);
          return;
        }
        router.replace(next);
        router.refresh();
        return;
      }
      if (mode === "forgot") {
        if (!emailEnabled) {
          setError(copy.emailUnavailable);
          return;
        }
        const email = accountEmail.safeParse(str("email"));
        if (!email.success) {
          setError(copy.invalidForm);
          return;
        }
        const result = await client.requestPasswordReset({
          email: email.data,
          redirectTo: `${root}/restablecer`,
        });
        if (result.error) {
          setError(copy.genericError);
          return;
        }
        setMessage(copy.resetSent);
        return;
      }
      if (mode === "reset") {
        const input = resetPasswordSchema.safeParse({
          password: str("password"),
          confirmPassword: str("confirmPassword"),
          token: params.get("token") ?? "",
        });
        if (!input.success) {
          setError(copy.invalidForm);
          return;
        }
        const result = await client.resetPassword({
          newPassword: input.data.password,
          token: input.data.token,
        });
        if (result.error) {
          setError(copy.invalidToken);
          return;
        }
        setMessage(copy.resetDone);
        event.currentTarget?.reset();
        return;
      }
      if (mode === "register") {
        const input = registrationSchema.safeParse({
          name: str("name"),
          email: str("email"),
          password: str("password"),
          confirmPassword: str("confirmPassword"),
          terms: data.get("terms") === "on",
        });
        if (!input.success) {
          setError(copy.invalidForm);
          return;
        }
        const result = await customerAuthClient.signUp.email({
          name: input.data.name,
          email: input.data.email,
          password: input.data.password,
          callbackURL: "/cuenta",
        });
        if (result.error) {
          setError(
            result.error.status === 429 ? copy.tooMany : copy.genericError,
          );
          return;
        }
        if (!result.data.token) {
          setMessage(copy.registrationDone);
          return;
        }
        router.replace(next);
        router.refresh();
        return;
      }
      const input = loginSchema.safeParse({
        email: str("email"),
        password: str("password"),
        rememberMe: data.get("remember") === "on",
      });
      if (!input.success) {
        setError(copy.invalidForm);
        return;
      }
      const result = await client.signIn.email({
        ...input.data,
        callbackURL: next,
      });
      if (result.error) {
        setError(
          result.error.status === 429 ? copy.tooMany : copy.invalidCredentials,
        );
        return;
      }
      if (
        result.data &&
        "twoFactorRedirect" in result.data &&
        result.data.twoFactorRedirect
      ) {
        setTwoFactor(true);
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError(copy.genericError);
    } finally {
      setBusy(false);
    }
  }

  const title = twoFactor
    ? copy.twoFactor
    : mode === "register"
      ? copy.register
      : mode === "forgot"
        ? copy.forgot
        : mode === "reset"
          ? copy.reset
          : copy.login;
  const invalidToken =
    mode === "reset" && (!params.get("token") || params.has("error"));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-foreground-muted mt-2 text-sm">
          {twoFactor
            ? copy.twoFactorHint
            : mode === "forgot"
              ? copy.resetIntro
              : staff
                ? copy.adminIntro
                : mode === "register"
                  ? copy.registerIntro
                  : copy.loginIntro}
        </p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        {twoFactor ? (
          <div className="space-y-2">
            <Label htmlFor="code">{backup ? copy.backupCode : copy.code}</Label>
            <Input
              id="code"
              name="code"
              autoComplete="one-time-code"
              inputMode={backup ? "text" : "numeric"}
              required
              maxLength={backup ? 64 : 6}
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() => setBackup(!backup)}
            >
              {backup ? copy.useTotp : copy.useBackup}
            </Button>
          </div>
        ) : (
          <>
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="name">{copy.name}</Label>
                <Input
                  id="name"
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={120}
                />
              </div>
            )}
            {mode !== "reset" && (
              <div className="space-y-2">
                <Label htmlFor="email">{copy.email}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={160}
                />
              </div>
            )}
            {mode !== "forgot" && (
              <div className="space-y-2">
                <Label htmlFor="password">
                  {mode === "reset" ? copy.newPassword : copy.password}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={show ? "text" : "password"}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    minLength={mode === "login" ? 1 : 10}
                    maxLength={128}
                    required
                    className="pr-12"
                  />
                  <button
                    type="button"
                    aria-label={show ? copy.hidePassword : copy.showPassword}
                    onClick={() => setShow(!show)}
                    className="absolute inset-y-0 right-0 px-3"
                  >
                    {show ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                {mode !== "login" && (
                  <p className="text-foreground-muted text-xs">
                    {copy.passwordHint}
                  </p>
                )}
              </div>
            )}
            {(mode === "register" || mode === "reset") && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{copy.confirmPassword}</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  maxLength={128}
                />
              </div>
            )}
            {mode === "login" && (
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="remember" defaultChecked />
                  {copy.remember}
                </label>
                <Link
                  className="text-brand underline"
                  href={`${root}/recuperar`}
                >
                  {copy.forgot}
                </Link>
              </div>
            )}
            {mode === "register" && (
              <div className="space-y-2 text-sm">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    name="terms"
                    required
                    className="mt-1"
                  />
                  {copy.terms}
                </label>
                <div className="flex flex-wrap gap-3">
                  <Link href="/terminos" className="text-brand underline">
                    {copy.termsLink}
                  </Link>
                  <Link href="/privacidad" className="text-brand underline">
                    {copy.privacyLink}
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
        {mode === "forgot" && !emailEnabled && (
          <p role="status" className="bg-surface-muted rounded-md p-3 text-sm">
            {copy.emailUnavailable}
          </p>
        )}
        {invalidToken && (
          <p role="alert" className="text-sm text-red-700">
            {copy.invalidToken}
          </p>
        )}
        {(error || (params.get("error") && mode !== "reset")) && (
          <p
            role="alert"
            className="rounded-md bg-red-50 p-3 text-sm text-red-700"
          >
            {error || copy.verificationError}
          </p>
        )}
        {message && (
          <p role="status" className="bg-surface-muted rounded-md p-3 text-sm">
            {message}
          </p>
        )}
        <Button
          className="w-full"
          disabled={
            busy || invalidToken || (mode === "forgot" && !emailEnabled)
          }
          type="submit"
        >
          {busy
            ? copy.loading
            : twoFactor
              ? copy.verifyCode
              : mode === "forgot"
                ? copy.sendReset
                : title}
        </Button>
      </form>
      <div className="flex flex-wrap justify-center gap-4 text-sm">
        {mode !== "login" && (
          <Link className="text-brand underline" href={`${root}/login`}>
            {copy.login}
          </Link>
        )}
        {!staff && mode === "login" && (
          <Link
            className="text-brand underline"
            href={`/cuenta/registro?next=${encodeURIComponent(next)}`}
          >
            {copy.register}
          </Link>
        )}
        {staff && (
          <p className="text-foreground-muted text-center text-xs">
            {copy.adminNoSignup}
          </p>
        )}
      </div>
      <div className="border-border flex flex-wrap justify-between gap-3 border-t pt-4 text-sm">
        <Link href="/">{copy.backStore}</Link>
        <Link
          className="text-foreground-muted"
          href={staff ? "/cuenta/login" : "/admin/login"}
        >
          {staff ? copy.customerAccess : copy.adminAccess}
        </Link>
      </div>
    </div>
  );
}
