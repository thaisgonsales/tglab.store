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
  ImageIcon,
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
  setProductMediaAssociation,
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
  variantId: string | null;
  attributeValueId: string | null;
};

export type MediaVariantOption = { id: string; label: string };
export type MediaColorOption = {
  id: string;
  label: string;
  hex: string | null;
};

export function MediaManager({
  productId,
  initialMedia,
  variants,
  colors,
}: {
  productId: string;
  initialMedia: MediaItem[];
  variants: MediaVariantOption[];
  colors: MediaColorOption[];
}) {
  const [media, setMedia] = useState<MediaItem[]>(initialMedia);
  const [uploading, setUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [uploadAssociation, setUploadAssociation] = useState("");
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
  const assignMedia = useAction(setProductMediaAssociation, {
    successMessage: "Foto asociada correctamente",
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
          const [associationKind, associationId = ""] =
            uploadAssociation.split(":");
          let variantId = associationKind === "variant" ? associationId : null;
          let attributeValueId =
            associationKind === "color" ? associationId : null;

          if (variantId || attributeValueId) {
            const associationResult = await setProductMediaAssociation({
              mediaId: result.data.id,
              variantId,
              attributeValueId,
            });
            if (!associationResult.ok) {
              toast.error(associationResult.error);
              variantId = null;
              attributeValueId = null;
            }
          }
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
              variantId,
              attributeValueId,
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
          variantId: null,
          attributeValueId: null,
        },
      ]);
      setVideoUrl("");
    }
  }

  function chooseUploadTarget(association: string) {
    setUploadAssociation(association);
    fileRef.current?.click();
  }

  const generalMedia = media.filter(
    (item) => !item.attributeValueId && !item.variantId,
  );
  const colorGroups = colors.map((color) => ({
    key: `color:${color.id}`,
    title: color.label,
    hex: color.hex,
    items: media.filter((item) => item.attributeValueId === color.id),
  }));
  const variantGroups = variants
    .map((variant) => ({
      key: `variant:${variant.id}`,
      title: variant.label,
      items: media.filter((item) => item.variantId === variant.id),
    }))
    .filter((group) => group.items.length > 0);

  const selectedColor = colors.find(
    (color) => uploadAssociation === `color:${color.id}`,
  );
  const uploadTargetLabel = selectedColor
    ? `del color ${selectedColor.label}`
    : uploadAssociation.startsWith("variant:")
      ? "de la combinación seleccionada"
      : "generales del producto";

  return (
    <div className="space-y-4">
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/mp4,video/webm"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      {colors.length > 0 && (
        <div>
          <p className="text-sm font-semibold">Fotos por color</p>
          <p className="text-foreground-muted mt-1 text-xs">
            Entra al color correspondiente para subir sus fotos. El cliente verá
            esas imágenes cuando seleccione la bolita de ese color.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => chooseUploadTarget("")}
              disabled={uploading}
              className="border-border hover:border-brand/40 bg-surface flex items-center gap-3 rounded-xl border p-3 text-left"
            >
              <span className="bg-surface-muted flex size-10 items-center justify-center rounded-full">
                <ImageIcon className="text-foreground-muted size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  Fotos generales
                </span>
                <span className="text-foreground-muted block text-xs">
                  {generalMedia.length} archivo(s) · Subir fotos
                </span>
              </span>
              <Upload className="text-brand size-4" />
            </button>
            {colorGroups.map((group) => (
              <button
                key={group.key}
                type="button"
                onClick={() => chooseUploadTarget(group.key)}
                disabled={uploading}
                className="border-border hover:border-brand/40 bg-surface flex items-center gap-3 rounded-xl border p-3 text-left"
              >
                <span
                  className="size-10 shrink-0 rounded-full border border-black/10 shadow-inner"
                  style={{ backgroundColor: group.hex ?? "#d1d5db" }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {group.title}
                  </span>
                  <span className="text-foreground-muted block text-xs">
                    {group.items.length} foto(s) · Subir fotos de {group.title}
                  </span>
                </span>
                <Upload className="text-brand size-4" />
              </button>
            ))}
          </div>
        </div>
      )}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files.length)
            void handleFiles(e.dataTransfer.files);
        }}
        className="rounded-card border-border border border-dashed p-6 text-center"
      >
        <Upload className="text-foreground-muted mx-auto size-6" />
        <p className="mt-2 text-sm font-medium">
          Subir fotos {uploadTargetLabel}
        </p>
        <p className="text-foreground-muted mt-1 text-xs">
          Arrastra los archivos aquí o elígelos desde tu computador.
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
            `Elegir fotos ${uploadTargetLabel}`
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
            <div className="space-y-5">
              {[
                {
                  key: "general",
                  title: "Fotos generales",
                  hex: null,
                  items: generalMedia,
                },
                ...colorGroups,
              ]
                .filter((group) => group.items.length > 0)
                .map((group) => (
                  <section key={group.key} className="space-y-2">
                    <div className="flex items-center gap-2">
                      {group.hex && (
                        <span
                          className="size-4 rounded-full border border-black/10"
                          style={{ backgroundColor: group.hex }}
                        />
                      )}
                      <h3 className="text-sm font-semibold">{group.title}</h3>
                      <span className="text-foreground-muted text-xs">
                        {group.items.length}
                      </span>
                    </div>
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {group.items.map((item) => (
                        <SortableMedia
                          key={item.id}
                          item={item}
                          onDelete={() => handleDelete(item.id)}
                          onPrimary={() => handlePrimary(item.id)}
                          variants={variants}
                          colors={colors}
                          onAssociationChange={async (association) => {
                            const [kind, id = ""] = association.split(":");
                            const variantId = kind === "variant" ? id : null;
                            const attributeValueId =
                              kind === "color" ? id : null;
                            const result = await assignMedia.run({
                              mediaId: item.id,
                              variantId,
                              attributeValueId,
                            });
                            if (result.ok) {
                              setMedia((current) =>
                                current.map((entry) =>
                                  entry.id === item.id
                                    ? { ...entry, variantId, attributeValueId }
                                    : entry,
                                ),
                              );
                            }
                          }}
                        />
                      ))}
                    </ul>
                  </section>
                ))}

              {variantGroups.map((group) => (
                <section key={group.key} className="space-y-2">
                  <h3 className="text-sm font-semibold">
                    Combinación: {group.title}
                  </h3>
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {group.items.map((item) => (
                      <SortableMedia
                        key={item.id}
                        item={item}
                        onDelete={() => handleDelete(item.id)}
                        onPrimary={() => handlePrimary(item.id)}
                        variants={variants}
                        colors={colors}
                        onAssociationChange={async (association) => {
                          const [kind, id = ""] = association.split(":");
                          const variantId = kind === "variant" ? id : null;
                          const attributeValueId = kind === "color" ? id : null;
                          const result = await assignMedia.run({
                            mediaId: item.id,
                            variantId,
                            attributeValueId,
                          });
                          if (result.ok) {
                            setMedia((current) =>
                              current.map((entry) =>
                                entry.id === item.id
                                  ? { ...entry, variantId, attributeValueId }
                                  : entry,
                              ),
                            );
                          }
                        }}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
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
  variants,
  colors,
  onAssociationChange,
}: {
  item: MediaItem;
  onDelete: () => void;
  onPrimary: () => void;
  variants: MediaVariantOption[];
  colors: MediaColorOption[];
  onAssociationChange: (association: string) => void;
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
      {item.type === "IMAGE" && (variants.length > 0 || colors.length > 0) && (
        <div className="border-border bg-surface border-t p-2">
          <label className="text-foreground-muted mb-1 block text-[11px] font-medium">
            Mostrar esta foto cuando el cliente elija
          </label>
          <select
            value={
              item.attributeValueId
                ? `color:${item.attributeValueId}`
                : item.variantId
                  ? `variant:${item.variantId}`
                  : ""
            }
            onChange={(event) => onAssociationChange(event.target.value)}
            className="border-border bg-surface h-8 w-full rounded border px-2 text-xs"
            aria-label="Asignar foto a variante"
          >
            <option value="">Siempre (foto general)</option>
            {colors.length > 0 && (
              <optgroup label="Colores">
                {colors.map((color) => (
                  <option key={color.id} value={`color:${color.id}`}>
                    {color.label}
                  </option>
                ))}
              </optgroup>
            )}
            {variants.map((variant) => (
              <option key={variant.id} value={`variant:${variant.id}`}>
                Combinación exacta: {variant.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </li>
  );
}
