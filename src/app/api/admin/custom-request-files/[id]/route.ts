import { NextResponse } from "next/server";

import { getStaffSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { getPrivateObject } from "@/server/storage/private-storage";

export const runtime = "nodejs";

/** Entrega referencias privadas únicamente a personal autenticado. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  if (!(await getStaffSession())) {
    return new NextResponse("No autorizado", { status: 401 });
  }
  const { id } = await context.params;
  const file = await db.customRequestFile.findUnique({ where: { id } });
  if (!file?.storageKey) {
    return new NextResponse("No encontrado", { status: 404 });
  }
  try {
    const body = await getPrivateObject(file.storageKey);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": String(body.byteLength),
        "Cache-Control": "private, no-store",
        "Content-Disposition": `inline; filename="referencia-${file.id}.webp"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("No encontrado", { status: 404 });
  }
}
