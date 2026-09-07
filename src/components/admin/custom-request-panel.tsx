"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CUSTOM_REQUEST_STATUS_LABEL,
  CUSTOM_REQUEST_STATUSES,
  type CustomRequestStatus,
} from "@/lib/schemas/custom-request";
import { useAction } from "@/lib/use-action";
import { updateCustomRequest } from "@/server/actions/custom-request-actions";

export function CustomRequestPanel({
  request,
}: {
  request: { id: string; status: string; internalNotes: string };
}) {
  const router = useRouter();
  const [status, setStatus] = useState<CustomRequestStatus>(
    request.status as CustomRequestStatus,
  );
  const [notes, setNotes] = useState(request.internalNotes);

  const save = useAction(updateCustomRequest, {
    successMessage: "Guardado",
    onSuccess: () => router.refresh(),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Estado</label>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as CustomRequestStatus)}
          >
            {CUSTOM_REQUEST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CUSTOM_REQUEST_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notas internas</label>
          <Textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <Button
          size="sm"
          disabled={save.isPending}
          onClick={() =>
            save.run({
              id: request.id,
              status,
              internalNotes: notes || undefined,
            })
          }
        >
          Guardar
        </Button>
      </CardContent>
    </Card>
  );
}
