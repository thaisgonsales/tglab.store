/**
 * Crea (o actualiza la contrasena de) un usuario del staff de TG LAB.
 *
 *   npm run admin:create
 *
 * - El primer usuario creado recibe el rol "owner" automaticamente.
 * - No hay contrasenas por defecto. La contrasena se pide de forma interactiva.
 */
import { stdin, stdout } from "node:process";
import * as readline from "node:readline/promises";

import { ADMIN_ROLES, type AdminRole } from "../src/config/constants";
import { auth } from "../src/server/auth/auth";
import { db } from "../src/server/db";

const CTRL_C = 0x03;
const CTRL_D = 0x04;
const BACKSPACE = 0x7f;
const LF = 0x0a;
const CR = 0x0d;

/** Lee una linea sin mostrar los caracteres (para contrasenas). */
function askHidden(query: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!stdin.isTTY) {
      reject(new Error("Este script requiere una terminal interactiva."));
      return;
    }
    let buffer = "";
    stdout.write(query);
    stdin.resume();
    stdin.setRawMode(true);

    const onData = (chunk: Buffer) => {
      for (const byte of chunk) {
        if (byte === CTRL_C) {
          stdout.write("\n");
          process.exit(130);
        }
        if (byte === LF || byte === CR || byte === CTRL_D) {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          stdout.write("\n");
          resolve(buffer);
          return;
        }
        if (byte === BACKSPACE || byte === 0x08) {
          buffer = buffer.slice(0, -1);
          continue;
        }
        buffer += String.fromCharCode(byte);
      }
    };
    stdin.on("data", onData);
  });
}

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

type Inputs = { email: string; name: string; password: string; role?: string };

/** Modo no interactivo (CI / bootstrap): ADMIN_EMAIL + ADMIN_PASSWORD [+ ADMIN_NAME, ADMIN_ROLE]. */
function inputsFromEnv(): Inputs | null {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return null;
  return {
    email,
    password,
    name: process.env.ADMIN_NAME ?? "",
    role: process.env.ADMIN_ROLE,
  };
}

async function inputsInteractive(): Promise<Inputs> {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  stdout.write("\n=== TG LAB - crear usuario de administracion ===\n\n");

  const email = (await rl.question("Email: ")).trim().toLowerCase();
  if (!isValidEmail(email)) throw new Error("Email invalido.");
  const name = (await rl.question("Nombre: ")).trim();

  rl.pause();
  const password = await askHidden("Contrasena (min. 10 caracteres): ");
  const confirm = await askHidden("Repetir contrasena: ");
  if (password !== confirm) throw new Error("Las contrasenas no coinciden.");
  rl.close();

  return { email, name, password };
}

async function main(): Promise<void> {
  const raw = inputsFromEnv() ?? (await inputsInteractive());

  const email = raw.email.trim().toLowerCase();
  if (!isValidEmail(email)) throw new Error("Email invalido.");
  const name = raw.name.trim() || email.split("@")[0]!;
  const password = raw.password;
  if (password.length < 10) {
    throw new Error("La contrasena debe tener al menos 10 caracteres.");
  }

  const ctx = await auth.$context;
  const totalUsers = await ctx.internalAdapter.countTotalUsers();

  let role: AdminRole = "owner";
  if (totalUsers > 0) {
    const candidate = (raw.role ?? "staff").toLowerCase();
    role = (ADMIN_ROLES as readonly string[]).includes(candidate)
      ? (candidate as AdminRole)
      : "staff";
  }

  const passwordHash = await ctx.password.hash(password);
  const existing = await db.user.findUnique({ where: { email } });

  if (existing) {
    const account = await db.account.findFirst({
      where: { userId: existing.id, providerId: "credential" },
    });
    if (account) {
      await db.account.update({
        where: { id: account.id },
        data: { password: passwordHash },
      });
    } else {
      await ctx.internalAdapter.createAccount({
        userId: existing.id,
        providerId: "credential",
        accountId: existing.id,
        password: passwordHash,
      });
    }
    await db.user.update({
      where: { id: existing.id },
      data: { isActive: true },
    });
    stdout.write(
      `\n[ok] Contrasena actualizada para ${email} (rol: ${existing.role ?? "staff"}).\n\n`,
    );
    return;
  }

  const user = await ctx.internalAdapter.createUser(
    {
      email,
      name,
      emailVerified: true,
      role,
    },
    { method: "admin" },
  );
  await ctx.internalAdapter.createAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: passwordHash,
  });

  stdout.write(`\n[ok] Usuario creado: ${email} (rol: ${role}).\n`);
  stdout.write("     Inicia sesion en /admin/login\n\n");
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    stdout.write(
      `\nError: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  });
