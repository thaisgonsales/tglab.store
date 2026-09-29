"use client";

import { Pause, Play } from "lucide-react";
import { useRef, useState } from "react";

type DiscoveryVideo = { title: string; videoUrl: string; posterUrl: string };

function VideoCard({ video }: { video: DiscoveryVideo }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = async () => {
    const element = ref.current;
    if (!element) return;
    if (element.paused) await element.play();
    else element.pause();
  };

  return (
    <article
      data-reveal-item
      data-reveal-kind="scale"
      className="group relative w-[78vw] max-w-[19rem] shrink-0 snap-center overflow-hidden rounded-[1.4rem] bg-[#29272d] shadow-[0_14px_36px_rgba(41,39,45,.12)] md:w-auto md:max-w-none"
    >
      <video
        ref={ref}
        src={video.videoUrl}
        poster={video.posterUrl || undefined}
        muted
        playsInline
        preload="none"
        loop
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="aspect-[9/16] w-full object-cover transition-opacity duration-500"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
      <p className="absolute right-14 bottom-5 left-5 text-sm font-semibold text-white">
        {video.title}
      </p>
      <button
        type="button"
        onClick={toggle}
        aria-label={
          playing ? `Pausar ${video.title}` : `Reproducir ${video.title}`
        }
        className="absolute right-4 bottom-4 flex size-10 items-center justify-center rounded-full bg-white/90 text-[#29272d] shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        {playing ? (
          <Pause className="size-4" />
        ) : (
          <Play className="ml-0.5 size-4" />
        )}
      </button>
    </article>
  );
}

export function DiscoveryVideos({ videos }: { videos: DiscoveryVideo[] }) {
  if (!videos.length) return null;
  return (
    <section data-reveal className="py-16 sm:py-20">
      <p className="text-brand text-xs font-semibold tracking-[.16em] uppercase">
        En movimiento
      </p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        Descubre TG LAB
      </h2>
      <p className="text-foreground-muted mt-3 max-w-xl">
        Ideas, procesos y detalles detrás de nuestras creaciones.
      </p>
      <div className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
        {videos.map((video) => (
          <VideoCard key={video.videoUrl} video={video} />
        ))}
      </div>
    </section>
  );
}
