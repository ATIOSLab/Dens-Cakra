import { randomUUID } from 'node:crypto';
import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../types/authenticated-request.js';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(
    request: AuthenticatedRequest,
    response: Response,
    next: NextFunction,
  ): void {
    const supplied = request.header('x-request-id')?.trim();
    request.requestId =
      supplied && supplied.length <= 120 ? supplied : randomUUID();
    response.setHeader('X-Request-Id', request.requestId);
    next();
  }
}
