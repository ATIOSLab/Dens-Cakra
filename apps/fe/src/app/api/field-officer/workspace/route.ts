import { type NextRequest, NextResponse } from "next/server";

import { apiRouteErrorResponse } from "@/server/api-route-error";
import { getFieldOfficerWorkspace } from "@/server/field-ops/repository";

export async function GET(request: NextRequest) {
  try {
    const categoryId = request.nextUrl.searchParams.get("categoryId") || undefined;
    const from = request.nextUrl.searchParams.get("from") || undefined;
    const to = request.nextUrl.searchParams.get("to") || undefined;
    const sortBy = request.nextUrl.searchParams.get("sortBy") || undefined;
    const sortOrder = request.nextUrl.searchParams.get("sortOrder") || undefined;

    return NextResponse.json(
      await getFieldOfficerWorkspace(request.headers.get("cookie") ?? "", {
        categoryId,
        from,
        to,
        sortBy,
        sortOrder,
      }),
    );
  } catch (error) {
    return apiRouteErrorResponse(error, "Gagal memuat ruang kerja Petugas Wilayah (Gaswil).");
  }
}
