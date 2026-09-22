import Link from "next/link";
import { getCustomerSession } from "@/server/auth/customer-session";
import { getCustomerProfile, listCustomerAddresses } from "@/server/services/customer-account-service";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CheckoutForm } from "@/components/store/checkout-form";
import { getCartToken } from "@/server/services/cart-service";
import { quoteCart } from "@/server/services/pricing-service";
import { getFulfillmentConfig } from "@/server/services/shipping-service";
import { getSettingsGroup } from "@/server/services/settings-service";

export const metadata: Metadata = { title: "Finalizar compra" };

export default async function CheckoutPage() {
  const session = await getCustomerSession();
  const [profile, addresses, account] = await Promise.all([
    session ? getCustomerProfile(session.user.id) : null,
    session ? listCustomerAddresses(session.user.id) : [],
    getSettingsGroup("account"),
  ]);
  const cartToken = await getCartToken();
  const quote = cartToken
    ? await quoteCart({ cartToken, fulfillmentMethod: "PICKUP" })
    : null;

  if (!quote || quote.isEmpty) {
    redirect("/carrito");
  }

  const [commerce, contact, fulfillment] = await Promise.all([
    getSettingsGroup("commerce"),
    getSettingsGroup("contact"),
    getFulfillmentConfig(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        Finalizar compra
      </h1>
      <p className="text-foreground-muted mt-1 text-sm">
        No necesitas crear una cuenta. Todos los precios incluyen IVA.
      </p>

      <div className="bg-surface mt-6 rounded-md border p-4 text-sm">{session ? account.checkoutAccount : <><Link className="text-brand underline" href="/cuenta/login?next=/checkout">{account.checkoutLogin}</Link><p className="text-foreground-muted mt-1">{account.checkoutGuest}</p></>}</div>
      <div className="mt-6">
        <CheckoutForm
          initialQuote={quote}
          accountCopy={account}
          savedAddresses={addresses}
          accountDefaults={profile ? { firstName: profile.firstName || profile.name.split(" ")[0], lastName: profile.lastName || profile.name.split(" ").slice(1).join(" "), email: profile.email, phone: profile.phone, rut: profile.rut } : undefined}
          shippingEnabled={fulfillment.hasShipping}
          pickup={{
            enabled: commerce.pickupEnabled,
            instructions: commerce.pickupInstructions,
            addressPublic: contact.addressPublic,
            city: contact.city,
          }}
        />
      </div>
    </div>
  );
}
