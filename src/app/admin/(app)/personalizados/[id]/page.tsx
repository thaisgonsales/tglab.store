import Image from "next/image";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { CustomRequestPanel } from "@/components/admin/custom-request-panel";
import { formatDateShort, formatDateTime } from "@/lib/datetime";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function AdminCustomRequestDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const request = await db.customRequest
    .findUnique({ where: { id }, include: { files: true } })
    .catch(() => null);
  if (!request) notFound();

  const whatsapp = request.phone?.replace(/\D/g, "");

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={request.name}
        backHref="/admin/personalizados"
        description={`${request.email} · ${formatDateTime(request.createdAt)}`}
      />

      <div className="rounded-card border-border bg-surface border p-5">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <Row label="Email" value={request.email} />
          {request.phone && (
            <Row
              label="Teléfono"
              value={
                whatsapp ? (
                  <a
                    className="text-brand hover:underline"
                    href={`https://wa.me/${whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {request.phone}
                  </a>
                ) : (
                  request.phone
                )
              }
            />
          )}
          {request.quantity != null && (
            <Row label="Cantidad" value={String(request.quantity)} />
          )}
          {request.desiredDate && (
            <Row
              label="Fecha deseada"
              value={formatDateShort(request.desiredDate)}
            />
          )}
        </dl>

        <div className="mt-4">
          <p className="text-foreground-muted text-xs font-medium uppercase">
            Descripción
          </p>
          <p className="mt-1 text-sm whitespace-pre-line">
            {request.description}
          </p>
        </div>

        {request.notes && (
          <div className="mt-3">
            <p className="text-foreground-muted text-xs font-medium uppercase">
              Observaciones
            </p>
            <p className="mt-1 text-sm whitespace-pre-line">{request.notes}</p>
          </div>
        )}

        {request.files.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {request.files.map((f) => (
              <a
                key={f.id}
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="border-border relative size-24 overflow-hidden rounded-md border"
              >
                <Image
                  src={f.url}
                  alt=""
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </a>
            ))}
          </div>
        )}
      </div>

      <CustomRequestPanel
        request={{
          id: request.id,
          status: request.status,
          internalNotes: request.internalNotes ?? "",
        }}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-foreground-muted text-xs uppercase">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
