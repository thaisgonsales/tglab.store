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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia("(max-width: 767px)");
    if (reduced.matches || mobile.matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      video.style.transform = `translate3d(0, ${Math.min(window.scrollY * 0.035, 18)}px, 0)`;
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      video.style.transform = "";
    };
  }, []);

  return (
    <video
      ref={videoRef}
      poster={posterUrl || undefined}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover object-center will-change-transform"
    />
  );
}
