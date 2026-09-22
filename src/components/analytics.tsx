"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";

/**
 * Carga Google Analytics 4 y Meta Pixel solo si sus IDs están configurados
 * (`NEXT_PUBLIC_GA4_ID` / `NEXT_PUBLIC_META_PIXEL_ID`). Sin IDs no se carga nada.
 * Los eventos de e-commerce se disparan desde `src/lib/analytics.ts`.
 */
const CONSENT_KEY = "tglab_analytics_consent";

export function Analytics({
  ga4Id,
  metaPixelId,
}: {
  ga4Id: string;
  metaPixelId: string;
}) {
  const [consent, setConsent] = useState<"accepted" | "rejected" | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored !== "accepted" && stored !== "rejected") return;
    const timer = window.setTimeout(() => setConsent(stored), 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!ga4Id && !metaPixelId) return null;

  const choose = (value: "accepted" | "rejected") => {
    localStorage.setItem(CONSENT_KEY, value);
    setConsent(value);
  };

  return (
    <>
      {consent === "accepted" && ga4Id && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
              gtag('js',new Date());
              gtag('config','${ga4Id}',{send_page_view:true});`}
          </Script>
        </>
      )}
      {consent === "accepted" && metaPixelId && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
            n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
            document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('init','${metaPixelId}');fbq('track','PageView');`}
        </Script>
      )}
      {consent === null && (
        <aside
          aria-label="Preferencias de analítica"
          className="border-border bg-surface fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-xl border p-4 shadow-xl"
        >
          <p className="text-sm font-semibold">Tu privacidad importa</p>
          <p className="text-foreground-muted mt-1 text-xs leading-relaxed">
            Usamos analítica opcional para entender el uso de la tienda. No se
            cargará Google Analytics ni Meta Pixel sin tu autorización. Revisa
            nuestra{" "}
            <Link href="/privacidad" className="text-brand underline">
              política de privacidad
            </Link>
            .
          </p>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="border-border rounded-md border px-3 py-2 text-xs font-medium"
              onClick={() => choose("rejected")}
            >
              Rechazar
            </button>
            <button
              type="button"
              className="bg-brand text-brand-fg rounded-md px-3 py-2 text-xs font-medium"
              onClick={() => choose("accepted")}
            >
              Aceptar analítica
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
