import { type NextRequest, NextResponse } from "next/server";

import { apiRouteErrorResponse } from "@/server/api-route-error";
import { backendApi } from "@/server/backend-api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    return NextResponse.json(
      await backendApi("/jaring/report-categories", {
        cookie: request.headers.get("cookie") ?? "",
        query: {
          includeInactive: "true",
          search: searchParams.get("search") || undefined,
          limit: 200,
        },
      }),
    );
  } catch (error) {
    return apiRouteErrorResponse(error, "Gagal memuat kategori laporan.");
  }
}

export async function POST(request: NextRequest) {
  try {
    return NextResponse.json(
      await backendApi("/jaring/report-categories", {
        cookie: request.headers.get("cookie") ?? "",
        method: "POST",
        body: await request.json(),
        idempotent: true,
      }),
      { status: 201 },
    );
  } catch (error) {
    return apiRouteErrorResponse(error, "Gagal membuat kategori laporan.");
  }
}
