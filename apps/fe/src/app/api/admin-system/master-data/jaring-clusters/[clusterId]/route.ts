import { NextRequest, NextResponse } from "next/server";

import { backendApi } from "@/server/backend-api";

type Params = {
  params: Promise<{ clusterId: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { clusterId } = await params;
    return NextResponse.json(
      await backendApi(`/jaring/clusters/${clusterId}`, {
        cookie: request.headers.get("cookie") ?? "",
        method: "PATCH",
        body: await request.json(),
      }),
    );
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal memperbarui cluster Jaring." },
      { status: 500 },
    );
  }
}
