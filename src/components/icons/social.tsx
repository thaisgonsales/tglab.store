import type { SVGProps } from "react";

/** Íconos de marcas (lucide dejó de incluirlos). Glifos simples y neutros. */

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M14 9h3l.5-3H14V4.5c0-.8.3-1.5 1.6-1.5H18V.2C17.6.1 16.4 0 15.1 0 12.4 0 10.5 1.6 10.5 4.6V6H8v3h2.5v9H14V9z" />
    </svg>
  );
}
