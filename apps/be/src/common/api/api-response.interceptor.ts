import {
  CallHandler,
  ExecutionContext,
  Injectable,
  StreamableFile,
  type NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { map, type Observable } from 'rxjs';
import type { AuthenticatedRequest } from '../types/authenticated-request.js';
import type { ApiResult, ApiSuccess } from './api-response.js';
import { toJsonSafeValue } from './json-safe.js';

function isApiResult(value: unknown): value is ApiResult<unknown> {
  return Boolean(value && typeof value === 'object' && 'data' in value);
}

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const response = http.getResponse<Response>();

    return next.handle().pipe(
      map((value: unknown) => {
        if (
          response.statusCode === 204 ||
          response.headersSent ||
          value instanceof StreamableFile
        ) {
          return value;
        }

        const result = isApiResult(value) ? value : { data: value };
        const envelope: ApiSuccess<unknown> = {
          success: true,
          data: result.data,
          ...(result.message ? { message: result.message } : {}),
          ...(result.meta ? { meta: result.meta } : {}),
          requestId: request.requestId ?? 'unknown',
          timestamp: new Date().toISOString(),
        };

        return toJsonSafeValue(envelope);
      }),
    );
  }
}
