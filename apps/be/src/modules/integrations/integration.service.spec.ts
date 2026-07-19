import { jest } from '@jest/globals';
import { IntegrationStatus } from '../../generated/prisma/client.js';
import { IntegrationService } from './integration.service.js';

type ChannelRecord = {
  id: string;
  code: string;
  name: string;
  channelType: string;
  status: IntegrationStatus;
  config: Record<string, never>;
  lastHealthAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type ChannelSoftDeleteArgs = {
  where: { id: string };
  data: {
    code: string;
    status: IntegrationStatus;
    deletedAt: Date;
  };
};

type AuditCreateArgs = {
  data: {
    actorUserProfileId: string;
    actorAssignmentId: string;
    action: string;
    entityType: string;
    entityId: string;
  };
};

describe('IntegrationService', () => {
  describe('remove', () => {
    it('soft deletes WhatsApp channels so append-only webhook events stay intact', async () => {
      const channel: ChannelRecord = {
        id: '87d99e46-cd58-4e4e-9235-d213ccaf798f',
        code: 'WA_CENTER_MAIN',
        name: 'WA Center Main',
        channelType: 'WHATSAPP',
        status: IntegrationStatus.DEGRADED,
        config: {},
        lastHealthAt: null,
        deletedAt: null,
        createdAt: new Date('2026-07-19T00:00:00.000Z'),
        updatedAt: new Date('2026-07-19T00:00:00.000Z'),
      };
      const findFirstOrThrow = jest.fn<() => Promise<ChannelRecord>>(() =>
        Promise.resolve(channel),
      );
      const update = jest.fn<
        (args: ChannelSoftDeleteArgs) => Promise<ChannelRecord>
      >((args) =>
        Promise.resolve({
          ...channel,
          status: args.data.status,
          code: args.data.code,
          deletedAt: args.data.deletedAt,
        }),
      );
      const deleteChannel = jest.fn();
      const auditCreate = jest.fn<(args: AuditCreateArgs) => Promise<object>>(
        () => Promise.resolve({ id: 'audit-id' }),
      );
      const prisma = {
        integrationChannel: {
          findFirstOrThrow,
          update,
          delete: deleteChannel,
        },
        auditLog: {
          create: auditCreate,
        },
      };
      const whatsappBotRuntime = {
        deleteChannelSession: jest.fn<(channelId: string) => Promise<void>>(
          () => Promise.resolve(),
        ),
      };
      const service = new IntegrationService(
        prisma as never,
        {} as never,
        {} as never,
        whatsappBotRuntime as never,
      );

      await service.remove(channel.id, {
        userProfileId: 'user-profile-id',
        primaryAssignmentId: 'assignment-id',
      } as never);

      expect(whatsappBotRuntime.deleteChannelSession).toHaveBeenCalledWith(
        channel.id,
      );
      expect(deleteChannel).not.toHaveBeenCalled();
      expect(update).toHaveBeenCalledTimes(1);

      const updateArg = update.mock.calls[0][0];
      expect(updateArg.where).toEqual({ id: channel.id });
      expect(updateArg.data.code).toMatch(/^WA_CENTER_MAIN__deleted_\d+$/);
      expect(updateArg.data.status).toBe(IntegrationStatus.INACTIVE);
      expect(updateArg.data.deletedAt).toBeInstanceOf(Date);

      expect(auditCreate).toHaveBeenCalledTimes(1);
      const auditArg = auditCreate.mock.calls[0][0];
      expect(auditArg.data.action).toBe('INTEGRATION.DELETE');
      expect(auditArg.data.entityId).toBe(channel.id);
    });
  });
});
