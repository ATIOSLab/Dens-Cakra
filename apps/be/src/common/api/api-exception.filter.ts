import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../types/authenticated-request.js';
import { ApiException } from './api-exception.js';

const STATUS_CODES: Partial<Record<number, string>> = {
  400: 'BAD_REQUEST',
  401: 'AUTH_REQUIRED',
  403: 'PERMISSION_DENIED',
  404: 'RESOURCE_NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  423: 'OPERATIONAL_LOCKED',
  428: 'PRECONDITION_REQUIRED',
  429: 'RATE_LIMIT_EXCEEDED',
  503: 'DEPENDENCY_UNAVAILABLE',
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const response = http.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const apiException = exception instanceof ApiException ? exception : null;
    const rawResponse =
      exception instanceof HttpException ? exception.getResponse() : null;
    const message = this.resolveMessage(exception, rawResponse, status);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const method = request.method ?? 'UNKNOWN';
      const url = (request.originalUrl ?? request.url ?? 'unknown').split(
        '?',
        1,
      )[0];
      const error = exception instanceof Error ? exception : undefined;
      this.logger.error(
        `${method} ${url} failed: ${error?.message ?? String(exception)}`,
        error?.stack,
      );
    }

    response.status(status).json({
      success: false,
      error: {
        code:
          apiException?.code ?? STATUS_CODES[status] ?? 'INTERNAL_SERVER_ERROR',
        message,
        ...(apiException?.fields ? { fields: apiException.fields } : {}),
        ...(apiException?.details ? { details: apiException.details } : {}),
      },
      requestId: request.requestId ?? 'unknown',
      timestamp: new Date().toISOString(),
    });
  }

  private resolveMessage(
    exception: unknown,
    rawResponse: string | object | null,
    status: number,
  ): string {
    if (exception instanceof ApiException) {
      return exception.message;
    }

    if (status >= 500) {
      return 'An internal service error occurred.';
    }

    if (typeof rawResponse === 'string') {
      return rawResponse;
    }

    if (rawResponse && 'message' in rawResponse) {
      const value = (rawResponse as { message?: unknown }).message;
      return Array.isArray(value) ? value.join('; ') : String(value);
    }

    return 'Request could not be processed.';
  }
}
