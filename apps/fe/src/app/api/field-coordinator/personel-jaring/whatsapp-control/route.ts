import { type NextRequest, NextResponse } from "next/server";

import { apiRouteErrorResponse } from "@/server/api-route-error";
import { getWhatsappControlChannels } from "@/server/field-ops/repository";

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(await getWhatsappControlChannels(request.headers.get("cookie") ?? ""));
  } catch (error) {
    return apiRouteErrorResponse(error, "Gagal memuat kontrol WhatsApp.");
  }
}
