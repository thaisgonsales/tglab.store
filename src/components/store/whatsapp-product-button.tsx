import { FaWhatsapp } from "react-icons/fa";

import { buildWhatsappUrl } from "@/lib/whatsapp";

export function WhatsappProductButton({
  phone,
  template,
  productName,
  productUrl,
}: {
  phone: string;
  template: string;
  productName: string;
  productUrl: string;
}) {
  const href = buildWhatsappUrl(phone, `${template} ${productUrl}`, {
    producto: productName,
    url: productUrl,
  });
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="border-border hover:bg-surface-muted inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm"
    >
      <FaWhatsapp className="size-5 text-[#239b56]" aria-hidden="true" />
      Consultar por WhatsApp
    </a>
  );
}
