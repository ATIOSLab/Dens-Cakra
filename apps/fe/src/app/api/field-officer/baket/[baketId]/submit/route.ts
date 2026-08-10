import { type NextRequest, NextResponse } from "next/server";

import { apiRouteErrorResponse } from "@/server/api-route-error";
import { submitBaket } from "@/server/field-ops/repository";

type Params = {
  params: Promise<{
    baketId: string;
  }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { baketId } = await params;

    return NextResponse.json(await submitBaket(request.headers.get("cookie") ?? "", baketId));
  } catch (error) {
    return apiRouteErrorResponse(error, "Gagal mengirim Baket.");
  }
}
