import { type NextRequest, NextResponse } from "next/server";

import { apiRouteErrorResponse } from "@/server/api-route-error";
import { updateBaketDraft } from "@/server/field-ops/repository";

type Params = { params: Promise<{ baketId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { baketId } = await params;
    const body = await request.json();
    return NextResponse.json(await updateBaketDraft(request.headers.get("cookie") ?? "", baketId, body));
  } catch (error) {
    return apiRouteErrorResponse(error, "Gagal memperbarui draf Baket.");
  }
}
