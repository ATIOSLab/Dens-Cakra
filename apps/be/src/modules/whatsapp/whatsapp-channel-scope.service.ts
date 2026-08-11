import { Injectable } from '@nestjs/common';
import {
  SecretVaultService,
  type EncryptedValue,
} from '../infrastructure/secret-vault.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

type ChannelScopeRecord = { config: unknown };
type AssignmentScopeRecord = {
  id: string;
  areaScopes: Array<{ areaId: string }>;
};

@Injectable()
export class WhatsAppChannelScopeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: SecretVaultService,
  ) {}

  async isJaringAllowed(channel: ChannelScopeRecord, jaringAreaIds: string[]) {
    const config = this.readConfig(channel.config);
    const userId = typeof config.userId === 'string' ? config.userId : null;
    const operationalAssignmentId =
      typeof config.operationalAssignmentId === 'string'
        ? config.operationalAssignmentId
        : null;
    const scopeAreaId =
      typeof config.scopeAreaId === 'string' ? config.scopeAreaId : null;
    const explicitScopeAreaIds = this.uniqueAreaIds([
      ...(Array.isArray(config.scopeAreaIds) ? config.scopeAreaIds : []),
      scopeAreaId,
    ]);

    if (!userId || jaringAreaIds.length === 0) {
      return false;
    }

    const channelUser = (await this.prisma.userProfile.findUnique({
      where: { id: userId },
      include: {
        operationalAssignments: {
          where: { isActive: true, validUntil: null },
          include: {
            areaScopes: {
              where: { validUntil: null },
              select: { areaId: true },
            },
          },
        },
      },
    })) as { operationalAssignments?: AssignmentScopeRecord[] } | null;
    const activeAssignments = channelUser?.operationalAssignments ?? [];
    const scopedAssignments = operationalAssignmentId
      ? activeAssignments.filter(
          (assignment) => assignment.id === operationalAssignmentId,
        )
      : activeAssignments;
    let channelAreaIds = scopedAssignments.flatMap((assignment) =>
      assignment.areaScopes.map((scope) => scope.areaId),
    );

    if (channelAreaIds.length === 0) {
      return false;
    }

    if (explicitScopeAreaIds.length > 0) {
      for (const areaId of explicitScopeAreaIds) {
        const scopeAllowed =
          channelAreaIds.includes(areaId) ||
          Boolean(
            await this.prisma.administrativeAreaClosure.findFirst({
              where: {
                ancestorId: { in: channelAreaIds },
                descendantId: areaId,
              },
              select: { ancestorId: true },
            }),
          );

        if (!scopeAllowed) {
          return false;
        }
      }

      channelAreaIds = explicitScopeAreaIds;
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

  private uniqueAreaIds(values: unknown[]) {
    return [
      ...new Set(
        values
          .map((value) => (typeof value === 'string' ? value.trim() : ''))
          .filter(Boolean),
      ),
    ];
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
