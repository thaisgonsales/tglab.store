import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCLP } from "@/lib/money";
import { getSettingsGroup } from "@/server/services/settings-service";

export const dynamic = "force-dynamic";

export default async function AdminShippingPage() {
  const commerce = await getSettingsGroup("commerce");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Despachos"
        description="La tienda usa un sistema simple, sin cotizadores ni compra automática de etiquetas."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dentro de Chiloé</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatCLP(commerce.chiloeShippingPrice)}
            </p>
            <p className="text-foreground-muted mt-1 text-sm">
              {commerce.chiloeShippingLabel}. Este valor se suma y se paga junto
              con el pedido.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Resto de Chile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">Por pagar</p>
            <p className="text-foreground-muted mt-1 text-sm">
              {commerce.payableShippingDescription}
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="border-border bg-surface-muted mt-5 rounded-xl border p-4 text-sm">
        <p className="font-medium">Nada se genera automáticamente</p>
        <p className="text-foreground-muted mt-1">
          Después de una compra, coordinas el transportista con el cliente y
          actualizas el seguimiento desde el pedido.
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/admin/configuracion">Cambiar valor o textos</Link>
        </Button>
      </div>
    </div>
  );
}
