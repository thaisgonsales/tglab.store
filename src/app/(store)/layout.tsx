import { SiteFooter } from "@/components/store/site-footer";
import { SiteHeader } from "@/components/store/site-header";
import { WhatsappButton } from "@/components/store/whatsapp-button";
import { getCartItemCount } from "@/server/services/cart-service";
import { getSettingsGroup } from "@/server/services/settings-service";

/**
 * La tienda se renderiza por solicitud: el carrito usa cookies y los precios /
 * stock deben ser siempre frescos. En Fase 5 se añade ISR selectivo al catálogo.
 */
export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: LayoutProps<"/">) {
  const [brand, cartCount] = await Promise.all([
    getSettingsGroup("brand"),
    getCartItemCount(),
  ]);

  return (
    <>
      <SiteHeader
        storeName={brand.storeName}
        logoUrl={brand.logoUrl || undefined}
        cartCount={cartCount}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <WhatsappButton />
    </>
  );
}
