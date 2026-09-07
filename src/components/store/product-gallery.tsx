"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type GalleryMedia = {
  id: string;
  type: "IMAGE" | "VIDEO";
  provider: string;
  url: string;
  posterUrl: string | null;
  alt: string | null;
  blurDataUrl: string | null;
};

function embedUrl(url: string): string | null {
  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/,
  );
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

export function ProductGallery({
  media,
  productName,
}: {
  media: GalleryMedia[];
  productName: string;
}) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const touchStartX = useRef<number | null>(null);

  if (media.length === 0) {
    return (
      <div className="rounded-card bg-surface-muted text-foreground-muted flex aspect-square items-center justify-center text-sm">
        Sin imagen
      </div>
    );
  }

  const current = media[Math.min(index, media.length - 1)]!;
  const go = (delta: number) =>
    setIndex((i) => (i + delta + media.length) % media.length);

  return (
    <div className="space-y-3">
      <div
        className="rounded-card bg-surface-muted relative aspect-square overflow-hidden"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          touchStartX.current = null;
        }}
      >
        {current.type === "IMAGE" ? (
          <button
            type="button"
            className={cn(
              "block h-full w-full",
              zoom ? "cursor-zoom-out" : "cursor-zoom-in",
            )}
            onClick={() => setZoom((z) => !z)}
            aria-label={zoom ? "Reducir" : "Ampliar imagen"}
          >
            <Image
              src={current.url}
              alt={current.alt ?? productName}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              placeholder={current.blurDataUrl ? "blur" : "empty"}
              blurDataURL={current.blurDataUrl ?? undefined}
              className={cn(
                "object-cover transition-transform duration-200",
                zoom && "scale-150",
              )}
            />
          </button>
        ) : current.provider === "external" ? (
          <iframe
            src={embedUrl(current.url) ?? current.url}
            title={`Video de ${productName}`}
            className="h-full w-full"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video
            src={current.url}
            poster={current.posterUrl ?? undefined}
            controls
            preload="none"
            playsInline
            className="h-full w-full object-contain"
          />
        )}

        {media.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Anterior"
              className="bg-background/80 hover:bg-background absolute top-1/2 left-2 -translate-y-1/2 rounded-full p-1.5 shadow"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Siguiente"
              className="bg-background/80 hover:bg-background absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1.5 shadow"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>

      {media.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto">
          {media.map((m, i) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Ver elemento ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "relative block size-16 shrink-0 overflow-hidden rounded-md border-2",
                  i === index ? "border-brand" : "border-transparent",
                )}
              >
                {m.type === "IMAGE" ? (
                  <Image
                    src={m.url}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center bg-black text-[10px] text-white">
                    video
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
