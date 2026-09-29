"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useAction } from "@/lib/use-action";
import { moderateReview } from "@/server/actions/engagement-actions";

export function ReviewModerationButtons({ id }: { id: string }) {
  const router = useRouter();
  const action = useAction(moderateReview, {
    successMessage: "Estado de la reseña actualizado",
    onSuccess: () => router.refresh(),
  });

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        disabled={action.isPending}
        onClick={() => action.run({ id, status: "APPROVED" })}
      >
        Aprobar
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={action.isPending}
        onClick={() => action.run({ id, status: "REJECTED" })}
      >
        Rechazar
      </Button>
    </div>
  );
}
