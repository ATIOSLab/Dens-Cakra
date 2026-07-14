import { jest } from '@jest/globals';
import { WhatsAppChannelScopeService } from './whatsapp-channel-scope.service.js';

function createService(channelAreaIds: string[], ancestorMatch = false) {
  const prisma = {
    userProfile: {
      findUnique: jest.fn(() =>
        Promise.resolve({
          positionAssignments: [
            {
              areaScopes: channelAreaIds.map((areaId) => ({ areaId })),
            },
          ],
        }),
      ),
    },
    administrativeAreaClosure: {
      findFirst: jest.fn(() =>
        Promise.resolve(ancestorMatch ? { ancestorId: 'area-channel' } : null),
      ),
    },
  };
  const service = new WhatsAppChannelScopeService(prisma as never, {} as never);

  return { service, prisma };
}

describe('WhatsAppChannelScopeService', () => {
  it('menolak channel tanpa userId', async () => {
    const { service, prisma } = createService(['area-channel']);

    await expect(
      service.isJaringAllowed({ config: {} }, ['area-jaring']),
    ).resolves.toBe(false);
    expect(prisma.userProfile.findUnique).not.toHaveBeenCalled();
  });

  it('menolak jaring tanpa cakupan wilayah', async () => {
    const { service, prisma } = createService(['area-channel']);

    await expect(
      service.isJaringAllowed({ config: { userId: 'user-id' } }, []),
    ).resolves.toBe(false);
    expect(prisma.userProfile.findUnique).not.toHaveBeenCalled();
  });

  it('menolak channel yang pemiliknya tidak memiliki scope wilayah', async () => {
    const { service } = createService([]);

    await expect(
      service.isJaringAllowed({ config: { userId: 'user-id' } }, [
        'area-jaring',
      ]),
    ).resolves.toBe(false);
  });

  it('mengizinkan cakupan wilayah yang sama atau turunan', async () => {
    const direct = createService(['area-jaring']);
    const descendant = createService(['area-channel'], true);

    await expect(
      direct.service.isJaringAllowed({ config: { userId: 'user-id' } }, [
        'area-jaring',
      ]),
    ).resolves.toBe(true);
    await expect(
      descendant.service.isJaringAllowed({ config: { userId: 'user-id' } }, [
        'area-jaring',
      ]),
    ).resolves.toBe(true);
  });

  it('menolak jaring dari wilayah yang tidak berhubungan', async () => {
    const { service } = createService(['area-channel']);

    await expect(
      service.isJaringAllowed({ config: { userId: 'user-id' } }, [
        'area-jaring',
      ]),
    ).resolves.toBe(false);
  });
});
