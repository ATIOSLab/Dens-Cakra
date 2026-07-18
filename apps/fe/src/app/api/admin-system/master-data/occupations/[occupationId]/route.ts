import { type NextRequest, NextResponse } from "next/server";

import { backendApi } from "@/server/backend-api";

type RouteContext = {
  params: Promise<{ occupationId: string }>;
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { occupationId } = await params;
    return NextResponse.json(
      await backendApi(`/jaring/occupations/${occupationId}`, {
        cookie: request.headers.get("cookie") ?? "",
        method: "PATCH",
        body: await request.json(),
      }),
    );
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal memperbarui pekerjaan." },
      { status: 500 },
    );
  }
}
