import { toNextJsHandler } from "better-auth/next-js";
import { customerAuth } from "@/server/auth/customer-auth";

export const { GET, POST } = toNextJsHandler(customerAuth);
