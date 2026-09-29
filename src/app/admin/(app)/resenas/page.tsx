import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { ReviewModerationButtons } from "@/components/admin/review-moderation-buttons";
import { Badge } from "@/components/ui/badge";
import { requireStaff } from "@/server/auth/session";
import { listReviewsForAdmin } from "@/server/services/engagement-service";

const FILTERS = [
  ["", "Todas"],
  ["PENDING", "Pendientes"],
  ["APPROVED", "Aprobadas"],
  ["REJECTED", "Rechazadas"],
] as const;

const LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  PUBLISHED: "Aprobada",
  HIDDEN: "Rechazada",
};

export default async function ReviewsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  await requireStaff();
  const { estado } = await searchParams;
  const reviews = await listReviewsForAdmin(estado);

  return (
    <div>
      <PageHeader
        title="Reseñas"
        description={`${reviews.length} reseña(s) encontradas`}
      />
      <nav className="mb-5 flex flex-wrap gap-2" aria-label="Filtrar reseñas">
        {FILTERS.map(([value, label]) => (
          <Link
            key={value}
            href={value ? `?estado=${value}` : "/admin/resenas"}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              (estado ?? "") === value
                ? "bg-brand text-brand-fg border-brand"
                : "bg-surface hover:border-brand/40"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="space-y-4">
        {reviews.map((review) => (
          <article
            key={review.id}
            className="bg-surface rounded-card border p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="text-brand"
                    aria-label={`${review.rating} estrellas`}
                  >
                    {"★".repeat(review.rating)}
                  </span>
                  <Badge variant="outline">
                    {LABELS[review.status] ?? review.status}
                  </Badge>
                  <Badge variant="success">Compra verificada</Badge>
                </div>
                <h2 className="mt-2 font-semibold">
                  {review.title || review.product.name}
                </h2>
                <p className="text-foreground-muted mt-2 text-sm leading-relaxed">
                  {review.content}
                </p>
                <p className="text-foreground-muted mt-3 text-xs">
                  {review.account.name} · {review.account.email} ·{" "}
                  <Link
                    className="hover:text-brand"
                    href={`/producto/${review.product.slug}`}
                  >
                    {review.product.name}
                  </Link>
                </p>
              </div>
              <ReviewModerationButtons id={review.id} />
            </div>
          </article>
        ))}
        {!reviews.length && (
          <p className="text-foreground-muted rounded-card border border-dashed p-8 text-center text-sm">
            No hay reseñas en este estado.
          </p>
        )}
      </div>
    </div>
  );
}
