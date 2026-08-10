import { type NextRequest, NextResponse } from "next/server";

import { apiRouteErrorResponse } from "@/server/api-route-error";
import { createBaketFromMessage } from "@/server/field-ops/repository";

type Params = {
  params: Promise<{
    messageId: string;
  }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { messageId } = await params;
    const body = (await request.json()) as {
      categoryId: string;
      urgency: "LOW" | "NORMAL" | "HIGH" | "URGENT";
      normalizedContent?: string;
      fieldOfficerNote?: string;
      taskAssignmentId?: string;
    };

    return NextResponse.json(await createBaketFromMessage(request.headers.get("cookie") ?? "", messageId, body), {
      status: 201,
    });
  } catch (error) {
    return apiRouteErrorResponse(error, "Gagal membuat Baket dari laporan.");
  }
}
