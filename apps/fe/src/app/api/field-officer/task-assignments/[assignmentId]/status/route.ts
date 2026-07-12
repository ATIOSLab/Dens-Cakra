import { NextRequest, NextResponse } from "next/server";

import { updateTaskAssignmentStatus } from "@/server/field-ops/repository";

type Params = {
  params: Promise<{
    assignmentId: string;
  }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { assignmentId } = await params;
    const body = (await request.json()) as {
      nextStatus: "READ" | "ACKNOWLEDGED" | "IN_PROGRESS" | "COMPLETED";
      note?: string;
    };

    return NextResponse.json(
      await updateTaskAssignmentStatus(
        request.headers.get("cookie") ?? "",
        assignmentId,
        body.nextStatus,
        body.note,
      ),
    );
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal mengubah status tugas." },
      { status: 500 },
    );
  }
}
