export const INFO_PAGE_SLUGS = [
  "nosotros",
  "contacto",
  "preguntas-frecuentes",
  "terminos",
  "privacidad",
  "cambios-devoluciones",
  "despachos",
] as const;

export type InfoPageSlug = (typeof INFO_PAGE_SLUGS)[number];

export const INFO_PAGE_TITLES: Record<InfoPageSlug, string> = {
  nosotros: "Nosotros",
  contacto: "Contacto",
  "preguntas-frecuentes": "Preguntas frecuentes",
  terminos: "Términos y condiciones",
  privacidad: "Política de privacidad",
  "cambios-devoluciones": "Cambios y devoluciones",
  despachos: "Despachos y retiro",
};
