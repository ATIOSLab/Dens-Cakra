import { type NextRequest, NextResponse } from "next/server";

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
      title?: string;
      normalizedContent?: string;
      fieldOfficerNote?: string;
      taskAssignmentId?: string;
      eventTime?: string;
    };

    return NextResponse.json(await createBaketFromMessage(request.headers.get("cookie") ?? "", messageId, body), {
      status: 201,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Gagal membuat baket dari laporan.",
      },
      { status: 500 },
    );
  }
}
