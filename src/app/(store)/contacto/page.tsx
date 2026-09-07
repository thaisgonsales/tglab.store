import type { Metadata } from "next";

import { buildInfoMetadata, InfoPage } from "@/components/store/info-page";

export function generateMetadata(): Promise<Metadata> {
  return buildInfoMetadata("contacto");
}

export default function Page() {
  return <InfoPage slug="contacto" />;
}
