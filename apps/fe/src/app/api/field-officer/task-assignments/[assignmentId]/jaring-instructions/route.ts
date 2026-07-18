import { type NextRequest, NextResponse } from "next/server";

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
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Gagal meneruskan instruksi ke Jaring.",
      },
      { status: 500 },
    );
  }
}
