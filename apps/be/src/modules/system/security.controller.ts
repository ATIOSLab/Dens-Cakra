import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiContract } from '../../common/decorators/api-contract.decorator.js';
import { DomainAccessGuard } from '../../common/guards/domain-access.guard.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request.js';
import { apiResult } from '../../common/api/api-response.js';
import { PrismaService } from '../prisma/prisma.service.js';

const SESSION_ONLINE_WINDOW_MS = 90_000;

function isLocalhostSession(session: {
  ipAddress: string | null;
  locationLabel: string | null;
}) {
  const ipAddress = session.ipAddress?.trim().toLowerCase();
  const locationLabel = session.locationLabel?.trim().toLowerCase();

  return (
    ipAddress === '127.0.0.1' ||
    ipAddress === '::1' ||
    ipAddress === 'localhost' ||
    locationLabel?.startsWith('localhost') === true
  );
}

class SecuritySessionQuery {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
  @IsOptional() @IsString() search?: string;
  @Transform(({ value }) =>
    value === undefined
      ? true
      : value === 'false' || value === false
        ? false
        : Boolean(value),
  )
  @IsOptional()
  @IsBoolean()
  activeOnly = true;
}

@ApiTags('27. System Administration & Reference Data')
@UseGuards(SessionGuard, DomainAccessGuard)
@Controller('system/security')
export class SecurityController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('sessions')
  @ApiContract({
    operationId: 'apiSys020',
    contractId: 'API-SYS-020',
    summary: 'Daftar sesi login',
    roles: ['admin_system'],
  })
  async listSessions(
    @Query() q: SecuritySessionQuery,
    @Req() request: AuthenticatedRequest,
  ) {
    const now = new Date();
    if (request.authSession?.id) {
      await this.prisma.session.updateMany({
        where: { id: request.authSession.id, expiresAt: { gt: now } },
        data: { lastSeenAt: now },
      });
    }

    const onlineThreshold = new Date(now.getTime() - SESSION_ONLINE_WINDOW_MS);
    const where = {
      ...(q.activeOnly ? { expiresAt: { gt: now } } : {}),
      ...(q.search
        ? {
            OR: [
              {
                ipAddress: { contains: q.search, mode: 'insensitive' as const },
              },
              {
                locationLabel: {
                  contains: q.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                userAgent: { contains: q.search, mode: 'insensitive' as const },
              },
              {
                user: {
                  OR: [
                    {
                      name: {
                        contains: q.search,
                        mode: 'insensitive' as const,
                      },
                    },
                    {
                      email: {
                        contains: q.search,
                        mode: 'insensitive' as const,
                      },
                    },
                  ],
                },
              },
              {
                user: {
                  profile: {
                    OR: [
                      {
                        username: {
                          contains: q.search,
                          mode: 'insensitive' as const,
                        },
                      },
                      {
                        fullName: {
                          contains: q.search,
                          mode: 'insensitive' as const,
                        },
                      },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    };

    const candidateSessions = await this.prisma.session.findMany({
      where,
      take: Math.min(q.limit * 5, 500),
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            profile: {
              select: {
                id: true,
                username: true,
                fullName: true,
                lastLoginAt: true,
                status: true,
              },
            },
          },
        },
      },
    });

    const sessionsByUser = new Map<
      string,
      (typeof candidateSessions)[number]
    >();

    for (const session of candidateSessions) {
      if (isLocalhostSession(session)) {
        continue;
      }

      const existing = sessionsByUser.get(session.userId);
      const isCurrentSession = request.authSession?.id === session.id;
      const existingIsCurrent = request.authSession?.id === existing?.id;
      const isOnline = Boolean(
        session.lastSeenAt && session.lastSeenAt >= onlineThreshold,
      );
      const existingIsOnline = Boolean(
        existing?.lastSeenAt && existing.lastSeenAt >= onlineThreshold,
      );

      if (
        !existing ||
        (isCurrentSession && !existingIsCurrent) ||
        (!existingIsCurrent && isOnline && !existingIsOnline)
      ) {
        sessionsByUser.set(session.userId, session);
      }
    }

    const sessions = Array.from(sessionsByUser.values()).slice(0, q.limit);

    return apiResult(
      sessions.map((session) => ({
        id: session.id,
        userId: session.userId,
        userName: session.user.name,
        userEmail: session.user.email,
        userRole: session.user.role,
        userProfileId: session.user.profile?.id ?? null,
        username: session.user.profile?.username ?? null,
        fullName: session.user.profile?.fullName ?? null,
        lastLoginAt: session.user.profile?.lastLoginAt ?? null,
        profileStatus: session.user.profile?.status ?? null,
        ipAddress: session.ipAddress ?? null,
        locationLabel: session.locationLabel ?? null,
        userAgent: session.userAgent ?? null,
        lastSeenAt: session.lastSeenAt ?? null,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        isCurrentSession: request.authSession?.id === session.id,
        isOnline: Boolean(
          session.lastSeenAt && session.lastSeenAt >= onlineThreshold,
        ),
      })),
    );
  }

  @Post('sessions/:sessionId/revoke')
  @ApiContract({
    operationId: 'apiSys021',
    contractId: 'API-SYS-021',
    summary: 'Cabut sesi login',
    roles: ['admin_system'],
    idempotent: true,
  })
  async revokeSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, userId: true },
    });

    if (!session) {
      return apiResult({ status: true });
    }

    await this.prisma.session.delete({
      where: { id: session.id },
    });

    return apiResult({
      status: true,
      revokedCurrentSession: request.authSession?.id === session.id,
    });
  }
}
