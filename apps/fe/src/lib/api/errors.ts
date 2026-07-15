import type { ApiErrorEnvelope } from "./types";

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;
  readonly fields?: Record<string, string[]> | Array<{ field: string; code?: string; message: string }>;
  readonly details?: unknown;

  constructor(status: number, envelope: ApiErrorEnvelope | null, fallbackMessage: string) {
    super(envelope?.error.message ?? fallbackMessage);
    this.name = "ApiClientError";
    this.status = status;
    this.code = envelope?.error.code ?? `HTTP_${status}`;
    this.requestId = envelope?.requestId;
    this.fields = envelope?.error.fields;
    this.details = envelope?.error.details;
  }
}

export function isMaskedNotFound(error: unknown) {
  return error instanceof ApiClientError && error.status === 404;
}

export function isAuthBoundaryError(error: unknown) {
  return error instanceof ApiClientError && [401, 403, 423].includes(error.status);
}
