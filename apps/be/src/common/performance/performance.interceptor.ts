import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { finalize, type Observable } from 'rxjs';
import { env } from '../../lib/env.js';
import type { AuthenticatedRequest } from '../types/authenticated-request.js';
import { getPerformanceContext } from './performance-context.js';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const response = http.getResponse<Response>();
    const startedAt = performance.now();
    const performanceContext = getPerformanceContext();

    response.once('finish', () => {
      const durationMs = performance.now() - startedAt;
      if (
        durationMs < env.performance.slowRequestMs &&
        Math.random() > env.performance.logSampleRate
      ) {
        return;
      }

      const path = (request.route?.path ?? request.path ?? request.url).split(
        '?',
        1,
      )[0];
      const responseBytes = response.getHeader('content-length');
      this.logger.log(
        JSON.stringify({
          event: 'api_performance',
          requestId: request.requestId ?? 'unknown',
          method: request.method,
          path,
          statusCode: response.statusCode,
          durationMs: Number(durationMs.toFixed(1)),
          responseBytes:
            typeof responseBytes === 'string' ||
            typeof responseBytes === 'number'
              ? Number(responseBytes)
              : null,
          cacheStatus: performanceContext?.cacheStatus ?? 'BYPASS',
        }),
      );
    });

    return next.handle().pipe(
      finalize(() => {
        const durationMs = performance.now() - startedAt;
        const cacheStatus = performanceContext?.cacheStatus ?? 'BYPASS';

        if (!response.headersSent) {
          response.setHeader(
            'Server-Timing',
            `app;dur=${durationMs.toFixed(1)}`,
          );
          response.setHeader('X-Cache-Status', cacheStatus);
        }
      }),
    );
  }
}
