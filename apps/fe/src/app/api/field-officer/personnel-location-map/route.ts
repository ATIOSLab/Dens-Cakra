import { type NextRequest, NextResponse } from "next/server";

import { apiRouteErrorResponse } from "@/server/api-route-error";
import { backendApi } from "@/server/backend-api";

export async function GET(request: NextRequest) {
  try {
    const capturedAfter = request.nextUrl.searchParams.get("capturedAfter") ?? undefined;

    return NextResponse.json(
      await backendApi("/personnel-location-map", {
        cookie: request.headers.get("cookie") ?? "",
        query: { capturedAfter },
      }),
    );
  } catch (error) {
    return apiRouteErrorResponse(error, "Gagal membaca peta lokasi personel.");
  }
}
