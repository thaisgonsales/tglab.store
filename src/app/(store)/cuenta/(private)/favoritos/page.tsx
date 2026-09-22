import { Heart } from "lucide-react";
import { ProductCard } from "@/components/store/product-card";
import { requireCustomer } from "@/server/auth/customer-session";
import { listFavorites } from "@/server/services/engagement-service";

export default async function FavoritesPage() {
  const session = await requireCustomer();
  const products = await listFavorites(session.user.id);
  return (
    <div>
      <h2 className="text-xl font-semibold">Mis favoritos</h2>
      {products.length ? (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </>
        </div>
      ) : (
        <div className="border-border rounded-card mt-6 border border-dashed p-10 text-center">
          <Heart className="text-brand mx-auto size-7" />
          <p className="mt-3 font-medium">Aún no guardas favoritos</p>
          <p className="text-foreground-muted mt-1 text-sm">
            Guarda los productos que quieras volver a encontrar fácilmente.
          </p>
        </div>
      )}
    </div>
  );
}
