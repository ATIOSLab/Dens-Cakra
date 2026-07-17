import { NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { IdentityService } from './identity.service.js';

describe('IdentityService session heartbeat', () => {
  it('memperbarui lastSeenAt hanya untuk sesi pengguna yang masih valid', async () => {
    const updateMany = jest.fn(() => Promise.resolve({ count: 1 }));
    const service = new IdentityService({
      session: { updateMany },
    } as never);

    const result = await service.recordSessionHeartbeat({
      sessionId: 'session-1',
      authUserId: 'user-1',
    });

    expect(result.lastSeenAt).toBeInstanceOf(Date);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 'session-1',
        userId: 'user-1',
        expiresAt: { gt: result.lastSeenAt },
      },
      data: { lastSeenAt: result.lastSeenAt },
    });
  });

  it('menolak heartbeat untuk sesi yang tidak aktif', async () => {
    const service = new IdentityService({
      session: {
        updateMany: jest.fn(() => Promise.resolve({ count: 0 })),
      },
    } as never);

    await expect(
      service.recordSessionHeartbeat({
        sessionId: 'missing-session',
        authUserId: 'user-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('menandai sesi tidak aktif saat tab dashboard ditutup', async () => {
    const updateMany = jest.fn(() => Promise.resolve({ count: 1 }));
    const service = new IdentityService({
      session: { updateMany },
    } as never);

    await expect(
      service.markSessionInactive({
        sessionId: 'session-1',
        authUserId: 'user-1',
      }),
    ).resolves.toEqual({ inactive: true });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'session-1', userId: 'user-1' },
      data: { lastSeenAt: null },
    });
  });
});
