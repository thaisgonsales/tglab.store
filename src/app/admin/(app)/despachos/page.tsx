import { PageHeader } from "@/components/admin/page-header";
import { ShippingZones } from "@/components/admin/shipping-zones";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

async function getZones() {
  try {
    return await db.shippingZone.findMany({
      orderBy: { position: "asc" },
      include: {
        locations: { orderBy: [{ region: "asc" }, { comuna: "asc" }] },
        rates: { orderBy: { position: "asc" } },
      },
    });
  } catch {
    return [];
  }
}

export default async function AdminShippingPage() {
  const zones = await getZones();

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Despachos"
        description="Define zonas (regiones y comunas cubiertas) y sus tarifas. El retiro se configura en Configuración."
      />
      <ShippingZones
        zones={zones.map((z) => ({
          id: z.id,
          name: z.name,
          isActive: z.isActive,
          locations: z.locations.map((l) => ({
            region: l.region,
            comuna: l.comuna,
          })),
          rates: z.rates.map((r) => ({
            id: r.id,
            name: r.name,
            price: r.price,
            freeOverSubtotal: r.freeOverSubtotal,
            minWeightGrams: r.minWeightGrams,
            maxWeightGrams: r.maxWeightGrams,
            isActive: r.isActive,
          })),
        }))}
      />
    </div>
  );
}
