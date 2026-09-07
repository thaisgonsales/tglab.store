import { WhatsappIcon } from "@/components/icons/social";
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
      <WhatsappIcon className="size-4 text-[#25D366]" />
      Consultar por WhatsApp
    </a>
  );
}
