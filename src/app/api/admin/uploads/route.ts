import { NextResponse, type NextRequest } from "next/server";

import { getStaffSession } from "@/server/auth/session";
import {
  handleUpload,
  UploadValidationError,
} from "@/server/upload/upload-service";
import type { UploadKind } from "@/server/upload/validate";

export const runtime = "nodejs";

const ALLOWED_FOLDERS = new Set([
  "productos",
  "categorias",
  "banners",
  "solicitudes",
]);

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const file = form.get("file");
  const folder = String(form.get("folder") ?? "productos");
  const allowParam = String(form.get("allow") ?? "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }
  if (!ALLOWED_FOLDERS.has(folder)) {
    return NextResponse.json({ error: "Destino inválido" }, { status: 400 });
  }

  const allow = allowParam
    ? (allowParam.split(",").filter(Boolean) as UploadKind[])
    : undefined;

  try {
    const result = await handleUpload(file, { folder, allow });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof UploadValidationError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("[api/admin/uploads] error", err);
    return NextResponse.json(
      { error: "No se pudo subir el archivo." },
      { status: 500 },
    );
  }
}
