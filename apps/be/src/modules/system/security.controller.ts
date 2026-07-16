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
    const where = {
      ...(q.activeOnly ? { expiresAt: { gt: new Date() } } : {}),
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

    const sessions = await this.prisma.session.findMany({
      where,
      take: q.limit,
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
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        isCurrentSession: request.authSession?.id === session.id,
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
