import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { getEnv } from "@/lib/env";
import { db } from "@/server/db";
import {
  isAuthEmailConfigured,
  sendAuthEmail,
} from "@/server/providers/auth-email";

const env = getEnv();

export const customerAuth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  basePath: "/api/customer-auth",
  database: prismaAdapter(db, { provider: "postgresql" }),
  user: {
    modelName: "customerUser",
    additionalFields: {
      isActive: { type: "boolean", defaultValue: true, input: false },
    },
  },
  session: {
    modelName: "customerSession",
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: false },
  },
  account: { modelName: "customerAccount" },
  verification: { modelName: "customerVerification" },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    ...(isAuthEmailConfigured()
      ? {
          sendResetPassword: async ({
            user,
            url,
          }: {
            user: { email: string };
            url: string;
          }) => sendAuthEmail(user.email, url, "reset"),
        }
      : {}),
  },
  emailVerification: {
    sendOnSignUp: isAuthEmailConfigured(),
    autoSignInAfterVerification: false,
    ...(isAuthEmailConfigured()
      ? {
          sendVerificationEmail: async ({
            user,
            url,
          }: {
            user: { email: string };
            url: string;
          }) => sendAuthEmail(user.email, url, "verify"),
        }
      : {}),
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const user = await db.customerUser.findUnique({
            where: { id: session.userId },
            select: { isActive: true },
          });
          if (!user?.isActive) return false;
        },
      },
    },
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    modelName: "authRateLimit",
    window: 60,
    max: 60,
  },
  advanced: {
    cookiePrefix: "tglab_customer",
    useSecureCookies: env.NODE_ENV === "production",
    defaultCookieAttributes: { sameSite: "lax" },
  },
  plugins: [nextCookies()],
});
