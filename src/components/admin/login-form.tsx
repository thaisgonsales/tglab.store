"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/admin";
  const [serverError, setServerError] = useState<string | null>(null);
  const [twoFactor, setTwoFactor] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const { data, error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
      callbackURL: next,
    });

    if (error) {
      setServerError(
        error.code === "INVALID_EMAIL_OR_PASSWORD"
          ? "Email o contraseña incorrectos."
          : (error.message ?? "No se pudo iniciar sesión."),
      );
      return;
    }

    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
      setTwoFactor(true);
      return;
    }

    router.replace(next);
    router.refresh();
  }

  if (twoFactor) {
    return (
      <p className="text-foreground-muted text-sm">
        Esta cuenta tiene verificación en dos pasos. La pantalla de código 2FA
        se habilita en la fase de seguridad.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-xs text-red-600">{errors.password.message}</p>
        )}
      </div>

      {serverError && (
        <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">
          {serverError}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Ingresando…" : "Ingresar"}
      </Button>
    </form>
  );
}
