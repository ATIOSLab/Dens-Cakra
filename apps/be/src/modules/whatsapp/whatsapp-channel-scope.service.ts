import { Injectable } from '@nestjs/common';
import {
  SecretVaultService,
  type EncryptedValue,
} from '../infrastructure/secret-vault.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

type ChannelScopeRecord = { config: unknown };

@Injectable()
export class WhatsAppChannelScopeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: SecretVaultService,
  ) {}

  async isJaringAllowed(channel: ChannelScopeRecord, jaringAreaIds: string[]) {
    const config = this.readConfig(channel.config);
    const userId = typeof config.userId === 'string' ? config.userId : null;

    if (!userId || jaringAreaIds.length === 0) {
      return false;
    }

    const channelUser = await this.prisma.userProfile.findUnique({
      where: { id: userId },
      include: {
        positionAssignments: {
          where: { isActive: true, validUntil: null },
          include: {
            areaScopes: {
              where: { validUntil: null },
              select: { areaId: true },
            },
          },
        },
      },
    });
    const channelAreaIds =
      channelUser?.positionAssignments.flatMap((assignment) =>
        assignment.areaScopes.map((scope) => scope.areaId),
      ) ?? [];

    if (channelAreaIds.length === 0) {
      return false;
    }

    if (jaringAreaIds.some((areaId) => channelAreaIds.includes(areaId))) {
      return true;
    }

    const ancestorMatch = await this.prisma.administrativeAreaClosure.findFirst(
      {
        where: {
          ancestorId: { in: channelAreaIds },
          descendantId: { in: jaringAreaIds },
        },
        select: { ancestorId: true },
      },
    );

    return Boolean(ancestorMatch);
  }

  private readConfig(config: unknown) {
    if (
      config &&
      typeof config === 'object' &&
      'algorithm' in config &&
      (config as { algorithm?: unknown }).algorithm === 'aes-256-gcm'
    ) {
      return this.vault.decrypt<Record<string, unknown>>(
        config as EncryptedValue,
      );
    }

    return (config as Record<string, unknown> | null) ?? {};
  }
}
