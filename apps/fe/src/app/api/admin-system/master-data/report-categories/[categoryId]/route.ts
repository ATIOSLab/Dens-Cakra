import { type NextRequest, NextResponse } from "next/server";

import { apiRouteErrorResponse } from "@/server/api-route-error";
import { backendApi } from "@/server/backend-api";

type RouteContext = {
  params: Promise<{ categoryId: string }>;
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { categoryId } = await params;
    return NextResponse.json(
      await backendApi(`/jaring/report-categories/${categoryId}`, {
        cookie: request.headers.get("cookie") ?? "",
        method: "PATCH",
        body: await request.json(),
      }),
    );
  } catch (error) {
    return apiRouteErrorResponse(error, "Gagal memperbarui kategori laporan.");
  }
}
