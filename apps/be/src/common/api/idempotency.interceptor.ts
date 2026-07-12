import { createHash } from 'node:crypto';
import {
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import {
  catchError,
  from,
  map,
  mergeMap,
  of,
  throwError,
  type Observable,
} from 'rxjs';
import { IdempotencyStatus, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../modules/prisma/prisma.service.js';
import { IDEMPOTENCY_OPERATION_KEY } from '../decorators/idempotent.decorator.js';
import type { AuthenticatedRequest } from '../types/authenticated-request.js';
import { canonicalJson } from '../utils/canonical-json.js';
import { ApiException } from './api-exception.js';

function toJsonCacheValue(
  value: unknown,
): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue {
  if (value === undefined) {
    return Prisma.JsonNull;
  }

  return JSON.parse(
    JSON.stringify(value, (_key, currentValue: unknown) =>
      typeof currentValue === 'bigint' ? currentValue.toString() : currentValue,
    ),
  ) as Prisma.InputJsonValue;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const operationId = this.reflector.getAllAndOverride<string>(
      IDEMPOTENCY_OPERATION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!operationId) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const key = request.header('idempotency-key')?.trim();

    if (!key) {
      throw new ApiException(
        'IDEMPOTENCY_KEY_REQUIRED',
        'Idempotency-Key is required for this operation.',
        428,
      );
    }

    if (key.length > 180) {
      throw new ApiException(
        'IDEMPOTENCY_KEY_INVALID',
        'Idempotency-Key must not exceed 180 characters.',
        400,
      );
    }

    const scopeKey =
      request.authorizationContext?.userProfileId ??
      request.authUser?.id ??
      request.ip ??
      'anonymous';
    const requestHash = createHash('sha256')
      .update(
        canonicalJson({
          method: request.method,
          path: request.originalUrl,
          body: request.body as unknown,
        }),
      )
      .digest('hex');

    return from(this.acquire(scopeKey, operationId, key, requestHash)).pipe(
      mergeMap((record) => {
        if (record.cached) {
          response.status(record.responseStatus ?? 200);
          return of(record.responseBody);
        }

        return next.handle().pipe(
          mergeMap((body: unknown) =>
            from(
              this.prisma.apiIdempotencyRecord.update({
                where: { id: record.id },
                data: {
                  status: IdempotencyStatus.SUCCEEDED,
                  responseStatus: response.statusCode,
                  responseBody: toJsonCacheValue(body),
                },
              }),
            ).pipe(map(() => body)),
          ),
          catchError((error: unknown) => {
            return from(
              this.prisma.apiIdempotencyRecord.update({
                where: { id: record.id },
                data: { status: IdempotencyStatus.FAILED },
              }),
            ).pipe(mergeMap(() => throwError(() => error)));
          }),
        );
      }),
    );
  }

  private async acquire(
    scopeKey: string,
    operationId: string,
    idempotencyKey: string,
    requestHash: string,
  ): Promise<{
    id: string;
    cached: boolean;
    responseStatus?: number | null;
    responseBody?: unknown;
  }> {
    const existing = await this.prisma.apiIdempotencyRecord.findUnique({
      where: {
        scopeKey_operationId_idempotencyKey: {
          scopeKey,
          operationId,
          idempotencyKey,
        },
      },
    });

    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new ApiException(
          'IDEMPOTENCY_CONFLICT',
          'The idempotency key was already used with a different payload.',
          409,
        );
      }

      if (existing.status === IdempotencyStatus.SUCCEEDED) {
        return {
          id: existing.id,
          cached: true,
          responseStatus: existing.responseStatus,
          responseBody: existing.responseBody,
        };
      }

      throw new ConflictException(
        'An operation with this idempotency key is already being processed.',
      );
    }

    try {
      const created = await this.prisma.apiIdempotencyRecord.create({
        data: {
          scopeKey,
          operationId,
          idempotencyKey,
          requestHash,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      return { id: created.id, cached: false };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return this.acquire(scopeKey, operationId, idempotencyKey, requestHash);
      }
      throw error;
    }
  }
}
