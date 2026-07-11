import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getFieldOfficerId, jsonError } from "@/app/api/field-officer/_utils";
import { getWorkspace, handleRepositoryError } from "@/server/field-officer/repository";

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(getWorkspace(getFieldOfficerId(request)));
  } catch (error) {
    return jsonError(handleRepositoryError(error));
  }
}
