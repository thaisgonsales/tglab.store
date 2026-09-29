import { FaWhatsapp } from "react-icons/fa";

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
      className="border-brand/45 fixed right-4 bottom-4 z-40 flex min-h-14 items-center justify-center gap-2.5 rounded-full border bg-[#fff9f4] px-4 text-sm font-semibold text-[#7b3c52] shadow-[0_6px_20px_rgba(85,55,65,.11)] transition-[transform,background-color,border-color,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:border-[#d95c82]/70 hover:bg-white hover:shadow-[0_9px_24px_rgba(85,55,65,.14)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d95c82] sm:right-6 sm:bottom-6 sm:min-h-[3.75rem] sm:px-5 sm:text-[15px]"
    >
      <FaWhatsapp className="size-7 shrink-0 text-[#239b56] sm:size-8" />
      <span>¿Necesitas ayuda?</span>
    </a>
  );
}
