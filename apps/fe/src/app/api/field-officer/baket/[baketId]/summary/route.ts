import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getFieldOfficerId, jsonError } from "@/app/api/field-officer/_utils";
import { handleRepositoryError, updateBaketSummary } from "@/server/field-officer/repository";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ baketId: string }> },
) {
  try {
    const body = (await request.json().catch(() => ({}))) as { summaryHtml?: string };
    const { baketId } = await params;
    return NextResponse.json(updateBaketSummary(getFieldOfficerId(request), baketId, body.summaryHtml || ""));
  } catch (error) {
    return jsonError(handleRepositoryError(error));
  }
}
