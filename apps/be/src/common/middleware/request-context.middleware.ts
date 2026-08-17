import { randomUUID } from 'node:crypto';
import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import {
  auditSourceFromPath,
  classifyRequestAudit,
  describeDevice,
  sanitizeAuditValue,
  shouldCaptureRequest,
} from '../audit/audit-forensics.js';
import type { AuthenticatedRequest } from '../types/authenticated-request.js';
import { runWithPerformanceContext } from '../performance/performance-context.js';
import { normalizeIpAddress } from '../../lib/ip-location.js';
import { PrismaService } from '../../modules/prisma/prisma.service.js';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestContextMiddleware.name);

  constructor(private readonly prisma: PrismaService) {}

  use(
    request: AuthenticatedRequest,
    response: Response,
    next: NextFunction,
  ): void {
    const startedAt = Date.now();
    const supplied = request.header('x-request-id')?.trim();
    request.requestId =
      supplied && supplied.length <= 120 ? supplied : randomUUID();
    response.setHeader('X-Request-Id', request.requestId);
    response.once('finish', () => {
      void this.captureRequest(request, response, startedAt).catch((error) => {
        this.logger.warn(
          `Failed to persist request audit ${request.requestId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    });
    runWithPerformanceContext(request.requestId, next);
  }

  private async captureRequest(
    request: AuthenticatedRequest,
    response: Response,
    startedAt: number,
  ) {
    const path = (request.originalUrl || request.url).split('?')[0] ?? '/';
    if (!shouldCaptureRequest(request.method, path)) return;

    const ipAddress = normalizeIpAddress(
      request.ip ||
        request.header('x-real-ip') ||
        request.header('x-forwarded-for'),
    );
    const userAgent = request.header('user-agent')?.slice(0, 4_000) ?? null;
    const durationMs = Math.max(0, Date.now() - startedAt);
    const context = request.authorizationContext;
    const statusCode = response.statusCode;
    const recentDeniedCount =
      statusCode === 401 || statusCode === 403
        ? await this.prisma.auditLog.count({
            where: {
              outcome: 'DENIED',
              createdAt: { gte: new Date(Date.now() - 5 * 60_000) },
              ...(context?.userProfileId
                ? { actorUserProfileId: context.userProfileId }
                : ipAddress
                  ? { ipAddress }
                  : { actorUserProfileId: null, ipAddress: null }),
            },
          })
        : 0;
    const classification = classifyRequestAudit({
      method: request.method,
      path,
      statusCode,
      durationMs,
      ipAddress,
      userAgent,
      recentDeniedCount,
    });
    const device = describeDevice(userAgent);
    const params = request.params ?? {};
    const entityEntry = Object.entries(params).find(([key, value]) =>
      Boolean(value && /id$/i.test(key)),
    );
    const entityIdValue = entityEntry?.[1];
    const entityId = (
      Array.isArray(entityIdValue) ? entityIdValue[0] : entityIdValue
    )?.slice(0, 100);
    const session = request.authSession as
      | (typeof request.authSession & { locationLabel?: string | null })
      | null
      | undefined;

    await this.prisma.auditLog.create({
      data: {
        actorUserProfileId: context?.userProfileId,
        actorAssignmentId: context?.primaryAssignmentId,
        action: `HTTP.${request.method.toUpperCase()}`.slice(0, 120),
        category: classification.category,
        severity: classification.severity,
        outcome: classification.outcome,
        entityType: entityEntry?.[0].replace(/Id$/i, '') || 'ApiRequest',
        entityId: entityId ?? null,
        metadata: sanitizeAuditValue({
          routeParams: params,
          queryKeys: Object.keys(request.query ?? {}).sort(),
          roleCode: context?.roleCode ?? null,
          branch: context?.commandRouteType ?? null,
          areaScopes:
            context?.areaScopes.map((scope) => ({
              areaId: scope.areaId,
              code: scope.code,
              name: scope.name,
              level: scope.level,
              isPrimary: scope.isPrimary,
            })) ?? [],
        }),
        ipAddress,
        deviceInfo: userAgent,
        ...device,
        locationLabel: session?.locationLabel ?? null,
        requestId: request.requestId,
        sessionId: request.authSession?.id,
        httpMethod: request.method.toUpperCase().slice(0, 12),
        requestPath: path.slice(0, 500),
        statusCode,
        durationMs,
        source: auditSourceFromPath(path),
        riskScore: classification.riskScore,
        isAnomaly: classification.isAnomaly,
        isIncident: classification.isIncident,
        riskIndicators: classification.indicators,
      },
    });
  }
}
