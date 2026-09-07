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
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 días
    updateAge: 60 * 60 * 24, // refresca la sesión 1 vez al día
    cookieCache: { enabled: true, maxAge: 5 * 60 },
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
