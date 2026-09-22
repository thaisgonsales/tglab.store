import { getCustomerSession } from "@/server/auth/customer-session";
import { SiteFooter } from "@/components/store/site-footer";
import { SiteHeader } from "@/components/store/site-header";
import { WhatsappButton } from "@/components/store/whatsapp-button";
import { ScrollReveal } from "@/components/store/scroll-reveal";
import { getCartItemCount } from "@/server/services/cart-service";
import { getSettingsGroup } from "@/server/services/settings-service";

/**
 * La tienda se renderiza por solicitud: el carrito usa cookies y los precios /
 * stock deben ser siempre frescos. En Fase 5 se añade ISR selectivo al catálogo.
 */
export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: LayoutProps<"/">) {
  const [brand, cartCount, session, account] = await Promise.all([
    getSettingsGroup("brand"),
    getCartItemCount(),
    getCustomerSession(),
    getSettingsGroup("account"),
  ]);

  return (
    <>
      <SiteHeader
        storeName={brand.storeName}
        logoUrl={brand.logoUrl || undefined}
        cartCount={cartCount}
        accountLabel={session ? account.account : account.login}
        accountHref={session ? "/cuenta" : "/cuenta/login"}
        announcement={
          brand.announcementEnabled ? brand.announcementText : undefined
        }
      />
      <ScrollReveal />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <WhatsappButton />
    </>
  );
}
