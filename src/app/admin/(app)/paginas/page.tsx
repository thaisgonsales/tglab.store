import { InfoPagesEditor } from "@/components/admin/info-pages-editor";
import { PageHeader } from "@/components/admin/page-header";
import { INFO_PAGE_SLUGS, INFO_PAGE_TITLES } from "@/config/info-pages";
import { getInfoPageForAdmin } from "@/server/services/pages-service";

export const dynamic = "force-dynamic";

export default async function AdminPagesPage() {
  const pages = await Promise.all(
    INFO_PAGE_SLUGS.map(async (slug) => {
      const page = await getInfoPageForAdmin(slug);
      return {
        slug,
        title: page.exists ? page.title : INFO_PAGE_TITLES[slug],
        body: page.body.join("\n\n"),
        isPublished: page.isPublished,
        isPlaceholder: !page.exists,
        seoTitle: page.seoTitle,
        seoDescription: page.seoDescription,
      };
    }),
  );

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Páginas informativas"
        description="Nosotros, contacto, términos, privacidad, cambios/devoluciones, despachos, FAQ."
      />
      <InfoPagesEditor pages={pages} />
    </div>
  );
}
