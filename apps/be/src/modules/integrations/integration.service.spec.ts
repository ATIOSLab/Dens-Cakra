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
  describe('whatsappControl', () => {
    it('keeps the control page available when one encrypted config cannot be decrypted', async () => {
      const decrypt = jest.fn(() => {
        throw new Error('Unsupported state or unable to authenticate data');
      });
      const prisma = {
        integrationChannel: {
          findMany: jest.fn(() =>
            Promise.resolve([
              {
                id: 'broken-channel-id',
                code: 'WA_LEGACY',
                name: 'WA Legacy',
                channelType: 'WHATSAPP',
                status: IntegrationStatus.ERROR,
                config: {
                  algorithm: 'aes-256-gcm',
                  keyVersion: 1,
                  iv: 'legacy-iv',
                  authTag: 'legacy-tag',
                  ciphertext: 'legacy-ciphertext',
                },
                lastHealthAt: null,
                updatedAt: new Date('2026-07-31T00:00:00.000Z'),
                botState: null,
                senderNumbers: [],
              },
            ]),
          ),
        },
        userProfile: {
          findMany: jest.fn(() => Promise.resolve([])),
        },
      };
      const service = new IntegrationService(
        prisma as never,
        { decrypt } as never,
        {} as never,
        {} as never,
      );

      const result = await service.whatsappControl();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'broken-channel-id',
        lastError:
          'Konfigurasi koneksi tidak dapat dibaca. Simpan ulang konfigurasi kanal WhatsApp.',
        requiresReconfiguration: true,
        userId: null,
      });
      expect(decrypt).toHaveBeenCalledTimes(1);
      expect(prisma.userProfile.findMany).not.toHaveBeenCalled();
    });

    it('re-encrypts an unreadable config when the WhatsApp channel is saved again', async () => {
      const encryptedConfig = {
        algorithm: 'aes-256-gcm',
        keyVersion: 1,
        iv: 'new-iv',
        authTag: 'new-tag',
        ciphertext: 'new-ciphertext',
      };
      const decrypt = jest
        .fn<() => Record<string, unknown>>()
        .mockImplementationOnce(() => {
          throw new Error('Unsupported state or unable to authenticate data');
        })
        .mockReturnValue({
          provider: 'baileys',
          userId: 'operator-id',
        });
      const encrypt = jest.fn(() => encryptedConfig);
      const update = jest.fn(() => Promise.resolve({ id: 'channel-id' }));
      const auditCreate = jest.fn(() => Promise.resolve({ id: 'audit-id' }));
      const findFirstOrThrow = jest
        .fn()
        .mockResolvedValueOnce({
          id: 'channel-id',
          code: 'WA_LEGACY',
          name: 'WA Legacy',
          channelType: 'WHATSAPP',
          status: IntegrationStatus.ERROR,
          config: {
            algorithm: 'aes-256-gcm',
            keyVersion: 1,
            iv: 'legacy-iv',
            authTag: 'legacy-tag',
            ciphertext: 'legacy-ciphertext',
          },
          lastHealthAt: null,
          updatedAt: new Date('2026-07-31T00:00:00.000Z'),
        })
        .mockResolvedValueOnce({
          id: 'channel-id',
          code: 'WA_LEGACY',
          name: 'WA Legacy',
          channelType: 'WHATSAPP',
          status: IntegrationStatus.ERROR,
          config: encryptedConfig,
          lastHealthAt: null,
          updatedAt: new Date('2026-07-31T00:00:00.000Z'),
          botState: null,
          senderNumbers: [],
        });
      const prisma = {
        integrationChannel: {
          findFirstOrThrow,
        },
        auditLog: {
          create: auditCreate,
        },
        $transaction: (callback: (tx: unknown) => Promise<unknown>) =>
          callback({
            integrationChannel: { update },
            whatsAppSenderNumber: {
              updateMany: jest.fn(),
              upsert: jest.fn(),
            },
          }),
      };
      const service = new IntegrationService(
        prisma as never,
        { decrypt, encrypt } as never,
        {} as never,
        {} as never,
      );

      const result = await service.updateWhatsappControl(
        'channel-id',
        { provider: 'baileys' },
        {
          userProfileId: 'operator-id',
          primaryAssignmentId: 'assignment-id',
        } as never,
      );

      expect(encrypt).toHaveBeenCalledWith({
        provider: 'baileys',
        userId: 'operator-id',
      });
      expect(update).toHaveBeenCalledWith({
        where: { id: 'channel-id' },
        data: { config: encryptedConfig },
      });
      expect(auditCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({ configRecovered: true }),
          }),
        }),
      );
      expect(result).toMatchObject({
        id: 'channel-id',
        provider: 'baileys',
        requiresReconfiguration: false,
      });
    });
  });

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
