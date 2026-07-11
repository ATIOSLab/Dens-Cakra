import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getFieldOfficerId, jsonError } from "@/app/api/field-officer/_utils";
import { createBaketFromIncoming, handleRepositoryError } from "@/server/field-officer/repository";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ incomingId: string }> },
) {
  try {
    const { incomingId } = await params;
    return NextResponse.json(createBaketFromIncoming(getFieldOfficerId(request), incomingId));
  } catch (error) {
    return jsonError(handleRepositoryError(error));
  }
}
