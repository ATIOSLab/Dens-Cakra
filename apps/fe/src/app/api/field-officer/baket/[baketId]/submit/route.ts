import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getFieldOfficerId, jsonError } from "@/app/api/field-officer/_utils";
import { handleRepositoryError, submitBaket } from "@/server/field-officer/repository";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ baketId: string }> },
) {
  try {
    const { baketId } = await params;
    return NextResponse.json(submitBaket(getFieldOfficerId(request), baketId));
  } catch (error) {
    return jsonError(handleRepositoryError(error));
  }
}
