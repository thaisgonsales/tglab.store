"use client";

import { useEffect, useState } from "react";

const CONSENT_KEY = "tglab_analytics_consent";

export function PrivacyPreferences() {
  const [value, setValue] = useState<"accepted" | "rejected" | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored !== "accepted" && stored !== "rejected") return;
    const timer = window.setTimeout(() => setValue(stored), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function choose(next: "accepted" | "rejected") {
    localStorage.setItem(CONSENT_KEY, next);
    setValue(next);
    window.location.reload();
  }

  return (
    <section className="border-brand/20 mt-8 rounded-xl border bg-[#fff8fa] p-5">
      <h2 className="text-foreground text-lg font-semibold">
        Preferencias de medición
      </h2>
      <p className="text-foreground-muted mt-2 text-sm">
        Estado actual:{" "}
        {value === "accepted"
          ? "aceptada"
          : value === "rejected"
            ? "rechazada"
            : "sin elegir"}
        . Puedes cambiar tu decisión cuando quieras.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="border-border rounded-full border bg-white px-4 py-2 text-sm font-medium"
          onClick={() => choose("rejected")}
        >
          Rechazar analítica
        </button>
        <button
          type="button"
          className="bg-brand text-brand-fg rounded-full px-4 py-2 text-sm font-medium"
          onClick={() => choose("accepted")}
        >
          Aceptar analítica
        </button>
      </div>
    </section>
  );
}
