"use client";

import { createAuthClient } from "better-auth/react";

export const customerAuthClient = createAuthClient({
  basePath: "/api/customer-auth",
});
