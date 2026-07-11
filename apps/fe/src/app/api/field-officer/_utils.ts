import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { DEFAULT_FIELD_OFFICER_ID } from "@/server/field-officer/types";

export function getFieldOfficerId(request: NextRequest) {
  return (
    request.headers.get("x-field-officer-id") ||
    request.nextUrl.searchParams.get("fieldOfficerId") ||
    DEFAULT_FIELD_OFFICER_ID
  );
}

export function jsonError(error: { message: string; status: number }) {
  return NextResponse.json({ message: error.message }, { status: error.status });
}
