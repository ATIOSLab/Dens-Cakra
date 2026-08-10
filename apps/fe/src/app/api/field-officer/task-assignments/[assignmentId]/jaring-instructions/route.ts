import { type NextRequest, NextResponse } from "next/server";

import { apiRouteErrorResponse } from "@/server/api-route-error";
import { forwardTaskInstructionToJaring } from "@/server/field-ops/repository";

type Params = {
  params: Promise<{
    assignmentId: string;
  }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { assignmentId } = await params;
    const body = (await request.json()) as {
      instruction: string;
      jaringIds?: string[];
    };

    return NextResponse.json(
      await forwardTaskInstructionToJaring(request.headers.get("cookie") ?? "", assignmentId, body),
      { status: 201 },
    );
  } catch (error) {
    return apiRouteErrorResponse(error, "Gagal meneruskan instruksi ke Jaring.");
  }
}
