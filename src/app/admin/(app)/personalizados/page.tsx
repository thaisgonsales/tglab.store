import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/datetime";
import { CUSTOM_REQUEST_STATUS_LABEL } from "@/lib/schemas/custom-request";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

async function getRequests(status?: string) {
  try {
    return await db.customRequest.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { _count: { select: { files: true } } },
    });
  } catch {
    return [];
  }
}

export default async function AdminCustomRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const requests = await getRequests(estado);

  return (
    <div>
      <PageHeader
        title="Solicitudes personalizadas"
        description={`${requests.length} solicitud(es)`}
      />

      <div className="mb-4 flex flex-wrap gap-1.5 text-sm">
        <Link
          href="/admin/personalizados"
          className={`rounded-full border px-3 py-1 ${!estado ? "border-brand bg-brand/10" : "border-border"}`}
        >
          Todas
        </Link>
        {Object.entries(CUSTOM_REQUEST_STATUS_LABEL).map(([v, l]) => (
          <Link
            key={v}
            href={`/admin/personalizados?estado=${v}`}
            className={`rounded-full border px-3 py-1 ${estado === v ? "border-brand bg-brand/10" : "border-border"}`}
          >
            {l}
          </Link>
        ))}
      </div>

      {requests.length === 0 ? (
        <p className="rounded-card border-border text-foreground-muted border border-dashed p-10 text-center text-sm">
          Sin solicitudes.
        </p>
      ) : (
        <ul className="space-y-2">
          {requests.map((r) => (
            <li
              key={r.id}
              className="rounded-card border-border bg-surface border p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/admin/personalizados/${r.id}`}
                    className="hover:text-brand font-medium"
                  >
                    {r.name}
                  </Link>
                  <p className="text-foreground-muted text-xs">
                    {r.email}
                    {r.phone ? ` · ${r.phone}` : ""} ·{" "}
                    {formatDateTime(r.createdAt)}
                    {r._count.files > 0
                      ? ` · ${r._count.files} imagen(es)`
                      : ""}
                  </p>
                  <p className="text-foreground-muted mt-1 line-clamp-2 text-sm">
                    {r.description}
                  </p>
                </div>
                <Badge variant="outline">
                  {
                    CUSTOM_REQUEST_STATUS_LABEL[
                      r.status as keyof typeof CUSTOM_REQUEST_STATUS_LABEL
                    ]
                  }
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
