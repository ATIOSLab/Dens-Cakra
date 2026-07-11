import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getFieldOfficerId, jsonError } from "@/app/api/field-officer/_utils";
import { handleRepositoryError, validateIncoming } from "@/server/field-officer/repository";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ incomingId: string }> },
) {
  try {
    const body = (await request.json().catch(() => ({}))) as { decision?: "Valid" | "Invalid" };
    const { incomingId } = await params;

    return NextResponse.json(validateIncoming(getFieldOfficerId(request), incomingId, body.decision || "Valid"));
  } catch (error) {
    return jsonError(handleRepositoryError(error));
  }
}
