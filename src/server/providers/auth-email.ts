import "server-only";

import { ResendEmailProvider } from "@/server/email/drivers";
import { getSettingsGroup } from "@/server/services/settings-service";

// Los correos de acceso nunca usan ConsoleEmailProvider ni registran tokens.
const provider = new ResendEmailProvider();
export function isAuthEmailConfigured() {
  return provider.isConfigured();
}

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

export async function sendAuthEmail(
  to: string,
  url: string,
  kind: "reset" | "verify",
) {
  if (!provider.isConfigured()) throw new Error("AUTH_EMAIL_NOT_CONFIGURED");
  const [brand, copy] = await Promise.all([
    getSettingsGroup("brand"),
    getSettingsGroup("account"),
  ]);
  const subject = `${brand.storeName} — ${kind === "reset" ? copy.recoverySubject : copy.verificationSubject}`;
  const result = await provider.send({
    to,
    subject,
    text: `${subject}\n\n${url}\n\n${copy.emailNotice}`,
    html: `<h1>${escapeHtml(subject)}</h1><p><a href="${escapeHtml(url)}">${escapeHtml(copy.emailLinkText)}</a></p><p>${escapeHtml(copy.emailNotice)}</p>`,
  });
  if (!result.id) throw new Error("AUTH_EMAIL_DELIVERY_FAILED");
}
