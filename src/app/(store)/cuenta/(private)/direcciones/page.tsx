import { requireCustomer } from "@/server/auth/customer-session";
import { listCustomerAddresses } from "@/server/services/customer-account-service";
import { getSettingsGroup } from "@/server/services/settings-service";
import { AddressBook } from "@/components/account/address-book";

export default async function Page() {
  const session = await requireCustomer();
  const [addresses, copy] = await Promise.all([
    listCustomerAddresses(session.user.id),
    getSettingsGroup("account"),
  ]);
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{copy.addresses}</h2>
      <AddressBook copy={copy} addresses={addresses} />
    </div>
  );
}
