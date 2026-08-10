import "server-only";

import { NextResponse } from "next/server";

import { BackendApiError } from "@/server/backend-api";

export function apiRouteErrorResponse(error: unknown, fallbackMessage: string) {
  const status = error instanceof BackendApiError ? error.status : 500;
  const message = error instanceof BackendApiError ? error.message : fallbackMessage;

  return NextResponse.json({ message }, { status });
}
