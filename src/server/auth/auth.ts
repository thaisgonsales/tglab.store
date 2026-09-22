import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, twoFactor } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
  userAc,
} from "better-auth/plugins/admin/access";
import { nextCookies } from "better-auth/next-js";

import { getEnv } from "@/lib/env";
import { db } from "@/server/db";
import { isAuthEmailConfigured, sendAuthEmail } from "@/server/providers/auth-email";

const env = getEnv();

/**
 * Control de acceso del panel:
 *  - owner: acceso total (gestiona usuarios, roles, etc.)
 *  - staff: operación diaria (sin gestión de usuarios)
 */
const ac = createAccessControl(defaultStatements);
const roles = {
  owner: ac.newRole({ ...adminAc.statements }),
  staff: ac.newRole({ ...userAc.statements }),
};

/**
 * Autenticación del personal de TG LAB (staff / administración).
 * - Solo email + contraseña. Sin registro público (`disableSignUp`).
 * - El primer administrador se crea con `npm run admin:create`.
 * - Roles: "owner" (acceso total) y "staff".
 */
export const auth = betterAuth({
  appName: "TG LAB Admin",
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  // La gestión pasa por servicios con protección del último propietario.
  disabledPaths: [
    "/admin/create-user", "/admin/update-user", "/admin/set-role",
    "/admin/remove-user", "/admin/ban-user", "/admin/unban-user",
    "/admin/set-user-password", "/admin/impersonate-user",
  ],
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    ...(isAuthEmailConfigured() ? {
      sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => sendAuthEmail(user.email, url, "reset"),
    } : {}),
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 días
    updateAge: 60 * 60 * 24, // refresca la sesión 1 vez al día
    cookieCache: { enabled: false },
  },
  rateLimit: { enabled: true, storage: "database", modelName: "authRateLimit", window: 60, max: 60 },
  databaseHooks: {
    session: { create: { before: async (session) => {
      const user = await db.user.findUnique({ where: { id: session.userId } });
      if (!user?.isActive || user.banned || !["owner", "staff"].includes(user.role ?? "")) return false;
    } } },
  },
  advanced: {
    cookiePrefix: "tglab_admin",
    useSecureCookies: env.NODE_ENV === "production",
    defaultCookieAttributes: { sameSite: "lax" },
  },
  user: {
    additionalFields: {
      isActive: {
        type: "boolean",
        defaultValue: true,
        input: false,
      },
    },
  },
  plugins: [
    admin({
      ac,
      roles,
      adminRoles: ["owner"],
      defaultRole: "staff",
    }),
    twoFactor(),
    nextCookies(), // debe ir al final: permite set-cookie desde Server Actions
  ],
});

export type Auth = typeof auth;
