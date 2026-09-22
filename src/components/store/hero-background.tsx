"use client";

import { useEffect, useRef } from "react";

export function HeroBackground({
  videoUrl,
  posterUrl,
}: {
  videoUrl: string;
  posterUrl: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      if (preference.matches) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      } else {
        video.src = videoUrl;
        void video.play().catch(() => {});
      }
    };
    sync();
    preference.addEventListener("change", sync);
    return () => {
      preference.removeEventListener("change", sync);
      video.pause();
    };
  }, [videoUrl]);

  return (
    <video
      ref={videoRef}
      poster={posterUrl || undefined}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover object-center"
    />
  );
}
