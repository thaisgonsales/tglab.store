"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Loader2,
  Play,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAction } from "@/lib/use-action";
import {
  addExternalVideo,
  addProductMedia,
  deleteProductMedia,
  reorderProductMedia,
  setPrimaryMedia,
} from "@/server/actions/media-actions";
import type { UploadResult } from "@/server/upload/upload-service";

export type MediaItem = {
  id: string;
  type: "IMAGE" | "VIDEO";
  provider: string;
  url: string;
  posterUrl: string | null;
  alt: string | null;
  isPrimary: boolean;
};

export function MediaManager({
  productId,
  initialMedia,
}: {
  productId: string;
  initialMedia: MediaItem[];
}) {
  const [media, setMedia] = useState<MediaItem[]>(initialMedia);
  const [uploading, setUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const reorder = useAction(reorderProductMedia);
  const remove = useAction(deleteProductMedia, {
    successMessage: "Elemento eliminado",
  });
  const makePrimary = useAction(setPrimaryMedia, {
    successMessage: "Imagen principal actualizada",
  });
  const addVideo = useAction(addExternalVideo, {
    successMessage: "Video agregado",
  });

  async function handleFiles(files: FileList) {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.set("file", file);
        form.set("folder", "productos");
        const res = await fetch("/api/admin/uploads", {
          method: "POST",
          body: form,
        });
        const json = (await res.json()) as UploadResult & { error?: string };
        if (!res.ok) {
          toast.error(json.error ?? "No se pudo subir el archivo");
          continue;
        }
        const result = await addProductMedia({
          productId,
          type: json.kind === "video" ? "VIDEO" : "IMAGE",
          provider: "local",
          url: json.url,
          storageKey: json.storageKey,
          width: json.width ?? undefined,
          height: json.height ?? undefined,
          blurDataUrl: json.blurDataUrl ?? undefined,
        });
        if (result.ok) {
          setMedia((m) => [
            ...m,
            {
              id: result.data.id,
              type: json.kind === "video" ? "VIDEO" : "IMAGE",
              provider: "local",
              url: json.url,
              posterUrl: null,
              alt: null,
              isPrimary: m.length === 0 && json.kind !== "video",
            },
          ]);
        } else {
          toast.error(result.error);
        }
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = media.findIndex((m) => m.id === active.id);
    const newIndex = media.findIndex((m) => m.id === over.id);
    const next = arrayMove(media, oldIndex, newIndex);
    setMedia(next);
    void reorder.run(
      productId,
      next.map((m) => m.id),
    );
  }

  async function handleDelete(id: string) {
    const result = await remove.run(id);
    if (result.ok) setMedia((m) => m.filter((x) => x.id !== id));
  }

  async function handlePrimary(id: string) {
    const result = await makePrimary.run(id);
    if (result.ok) {
      setMedia((m) => m.map((x) => ({ ...x, isPrimary: x.id === id })));
    }
  }

  async function handleAddVideo() {
    const result = await addVideo.run({ productId, url: videoUrl.trim() });
    if (result.ok) {
      setMedia((m) => [
        ...m,
        {
          id: result.data.id,
          type: "VIDEO",
          provider: "external",
          url: videoUrl.trim(),
          posterUrl: null,
          alt: null,
          isPrimary: false,
        },
      ]);
      setVideoUrl("");
    }
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files.length)
            void handleFiles(e.dataTransfer.files);
        }}
        className="rounded-card border-border border border-dashed p-6 text-center"
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/mp4,video/webm"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <Upload className="text-foreground-muted mx-auto size-6" />
        <p className="text-foreground-muted mt-2 text-sm">
          Arrastra imágenes o videos aquí, o
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Subiendo…
            </>
          ) : (
            "Elegir archivos"
          )}
        </Button>
        <p className="text-foreground-muted mt-2 text-xs">
          JPG, PNG, WebP, AVIF · MP4/WebM. Se optimizan automáticamente.
        </p>
      </div>

      {media.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={media.map((m) => m.id)}
            strategy={rectSortingStrategy}
          >
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {media.map((item) => (
                <SortableMedia
                  key={item.id}
                  item={item}
                  onDelete={() => handleDelete(item.id)}
                  onPrimary={() => handlePrimary(item.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="URL de YouTube o Vimeo"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={!videoUrl.trim() || addVideo.isPending}
          onClick={handleAddVideo}
        >
          Agregar video
        </Button>
      </div>
    </div>
  );
}

function SortableMedia({
  item,
  onDelete,
  onPrimary,
}: {
  item: MediaItem;
  onDelete: () => void;
  onPrimary: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group border-border bg-surface-muted relative overflow-hidden rounded-md border ${
        isDragging ? "z-10 opacity-70" : ""
      }`}
    >
      <div className="relative aspect-square">
        {item.type === "IMAGE" ? (
          <Image
            src={item.url}
            alt={item.alt ?? ""}
            fill
            sizes="200px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-black/80 text-white">
            <Play className="size-8" />
          </div>
        )}
      </div>

      <button
        type="button"
        className="absolute top-1 left-1 cursor-grab rounded bg-black/50 p-1 text-white"
        aria-label="Reordenar"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>

      <div className="absolute top-1 right-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {item.type === "IMAGE" && (
          <button
            type="button"
            aria-label="Marcar como principal"
            onClick={onPrimary}
            className="rounded bg-black/50 p-1 text-white"
          >
            <Star
              className={`size-3.5 ${item.isPrimary ? "fill-yellow-400 text-yellow-400" : ""}`}
            />
          </button>
        )}
        <button
          type="button"
          aria-label="Eliminar"
          onClick={onDelete}
          className="rounded bg-black/50 p-1 text-white hover:bg-red-600"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      {item.isPrimary && (
        <span className="bg-brand text-brand-fg absolute bottom-1 left-1 rounded px-1.5 py-0.5 text-[10px] font-medium">
          Principal
        </span>
      )}
    </li>
  );
}
