import { type NextRequest, NextResponse } from "next/server";

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
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal memperbarui kategori laporan." },
      { status: 500 },
    );
  }
}
