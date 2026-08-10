import { type NextRequest, NextResponse } from "next/server";

import { apiRouteErrorResponse } from "@/server/api-route-error";
import { updateFieldOfficerJaringStatus } from "@/server/field-ops/repository";

type Params = {
  params: Promise<{
    jaringId: string;
  }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { jaringId } = await params;
    const body = (await request.json()) as {
      action: "activate" | "deactivate" | "delete";
      reason: string;
    };

    return NextResponse.json(
      await updateFieldOfficerJaringStatus(request.headers.get("cookie") ?? "", jaringId, body.action, body.reason),
    );
  } catch (error) {
    return apiRouteErrorResponse(error, "Gagal mengubah status Jaring.");
  }
}
