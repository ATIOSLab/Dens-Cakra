import { NextRequest, NextResponse } from "next/server";

import { forwardTaskAssignmentToJaring } from "@/server/field-ops/repository";

type Params = {
  params: Promise<{
    assignmentId: string;
  }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { assignmentId } = await params;

    return NextResponse.json(
      await forwardTaskAssignmentToJaring(request.headers.get("cookie") ?? "", assignmentId),
    );
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal meneruskan tugas ke Jaring." },
      { status: 500 },
    );
  }
}
