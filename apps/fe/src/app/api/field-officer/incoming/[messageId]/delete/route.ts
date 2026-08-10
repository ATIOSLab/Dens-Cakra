import { type NextRequest, NextResponse } from "next/server";

import { apiRouteErrorResponse } from "@/server/api-route-error";
import { deleteIncomingMessage } from "@/server/field-ops/repository";

type RouteContext = {
  params: Promise<{ messageId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { messageId } = await params;

    return NextResponse.json(await deleteIncomingMessage(request.headers.get("cookie") ?? "", messageId));
  } catch (error) {
    return apiRouteErrorResponse(error, "Gagal menghapus laporan.");
  }
}
