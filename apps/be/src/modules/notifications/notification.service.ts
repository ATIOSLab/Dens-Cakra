import { Injectable } from '@nestjs/common';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ReadAllDto, NotificationQuery } from './notification.dto.js';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async list(context: AuthorizationContext, query: NotificationQuery) {
    return this.prisma.notification.findMany({
      where: {
        userProfileId: context.userProfileId,
        ...(query.type ? { type: query.type } : {}),
        ...(query.unreadOnly ? { readAt: null } : {}),
        ...(query.from || query.to
          ? {
              createdAt: {
                ...(query.from ? { gte: new Date(query.from) } : {}),
                ...(query.to ? { lte: new Date(query.to) } : {}),
              },
            }
          : {}),
      },
      take: query.limit,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  async unread(context: AuthorizationContext) {
    return {
      count: await this.prisma.notification.count({
        where: { userProfileId: context.userProfileId, readAt: null },
      }),
    };
  }

  async read(id: string, context: AuthorizationContext) {
    const item = await this.prisma.notification.findFirstOrThrow({
      where: { id, userProfileId: context.userProfileId },
    });
    return this.prisma.notification.update({
      where: { id: item.id },
      data: { readAt: item.readAt ?? new Date() },
    });
  }

  async readAll(body: ReadAllDto, context: AuthorizationContext) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userProfileId: context.userProfileId,
        readAt: null,
        ...(body.before ? { createdAt: { lte: new Date(body.before) } } : {}),
        ...(body.types ? { type: { in: body.types } } : {}),
      },
      data: { readAt: new Date() },
    });
    return { affectedCount: result.count };
  }
}
