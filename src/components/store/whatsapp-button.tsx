import { WhatsappIcon } from "@/components/icons/social";
import { buildWhatsappUrl } from "@/lib/whatsapp";
import { getSettingsGroup } from "@/server/services/settings-service";

/** Botón flotante de WhatsApp. No se renderiza si no hay número configurado. */
export async function WhatsappButton() {
  const contact = await getSettingsGroup("contact");
  if (!contact.whatsapp) return null;

  const href = buildWhatsappUrl(
    contact.whatsapp,
    "Hola, quisiera consultar por TG LAB.",
  );

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="fixed right-4 bottom-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105"
    >
      <WhatsappIcon className="size-6" />
    </a>
  );
}
