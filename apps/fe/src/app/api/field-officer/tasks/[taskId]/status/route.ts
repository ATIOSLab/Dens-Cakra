import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getFieldOfficerId, jsonError } from "@/app/api/field-officer/_utils";
import { handleRepositoryError, updateFieldTaskStatus } from "@/server/field-officer/repository";
import type { FieldTaskStatus } from "@/server/field-officer/types";

const allowedStatuses = new Set<FieldTaskStatus>(["Pending", "In Progress", "Completed"]);

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const body = (await request.json().catch(() => ({}))) as { status?: FieldTaskStatus };
    const { taskId } = await params;

    if (!body.status || !allowedStatuses.has(body.status)) {
      return NextResponse.json({ message: "Status tugas tidak valid" }, { status: 400 });
    }

    return NextResponse.json(updateFieldTaskStatus(getFieldOfficerId(request), taskId, body.status));
  } catch (error) {
    return jsonError(handleRepositoryError(error));
  }
}
