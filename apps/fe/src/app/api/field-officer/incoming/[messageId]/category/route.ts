import { type NextRequest, NextResponse } from "next/server";

import { apiRouteErrorResponse } from "@/server/api-route-error";
import { assignIncomingMessageCategory } from "@/server/field-ops/repository";

type RouteContext = {
  params: Promise<{ messageId: string }>;
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { messageId } = await params;
    const body = (await request.json()) as { categoryId?: string };

    if (!body.categoryId) {
      return NextResponse.json({ message: "Kategori laporan wajib dipilih." }, { status: 400 });
    }

    return NextResponse.json(
      await assignIncomingMessageCategory(request.headers.get("cookie") ?? "", messageId, body.categoryId),
    );
  } catch (error) {
    return apiRouteErrorResponse(error, "Gagal menyimpan kategori laporan.");
  }
}
