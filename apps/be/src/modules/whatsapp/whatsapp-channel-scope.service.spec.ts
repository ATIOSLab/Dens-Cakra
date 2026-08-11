import { jest } from '@jest/globals';
import { WhatsAppChannelScopeService } from './whatsapp-channel-scope.service.js';

function createService(channelAreaIds: string[], ancestorMatch = false) {
  const prisma = {
    userProfile: {
      findUnique: jest.fn(() =>
        Promise.resolve({
          operationalAssignments: [
            {
              id: 'assignment-id',
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

  it('membatasi channel ke wilayah pilihan dalam assignment aktif', async () => {
    const prisma = {
      userProfile: {
        findUnique: jest.fn(() =>
          Promise.resolve({
            operationalAssignments: [
              {
                id: 'assignment-id',
                areaScopes: [{ areaId: 'area-provinsi' }],
              },
            ],
          }),
        ),
      },
      administrativeAreaClosure: {
        findFirst: jest
          .fn<() => Promise<{ ancestorId: string } | null>>()
          .mockResolvedValueOnce({ ancestorId: 'area-provinsi' })
          .mockResolvedValueOnce(null),
      },
    };
    const service = new WhatsAppChannelScopeService(
      prisma as never,
      {} as never,
    );

    await expect(
      service.isJaringAllowed(
        {
          config: {
            userId: 'user-id',
            operationalAssignmentId: 'assignment-id',
            scopeAreaId: 'area-kota',
          },
        },
        ['area-luar'],
      ),
    ).resolves.toBe(false);
    expect(prisma.administrativeAreaClosure.findFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          ancestorId: { in: ['area-kota'] },
          descendantId: { in: ['area-luar'] },
        }),
      }),
    );
  });

  it('mengizinkan jaring turunan dari wilayah pilihan channel', async () => {
    const prisma = {
      userProfile: {
        findUnique: jest.fn(() =>
          Promise.resolve({
            operationalAssignments: [
              {
                id: 'assignment-id',
                areaScopes: [{ areaId: 'area-provinsi' }],
              },
            ],
          }),
        ),
      },
      administrativeAreaClosure: {
        findFirst: jest
          .fn<() => Promise<{ ancestorId: string } | null>>()
          .mockResolvedValueOnce({ ancestorId: 'area-provinsi' })
          .mockResolvedValueOnce({ ancestorId: 'area-kota' }),
      },
    };
    const service = new WhatsAppChannelScopeService(
      prisma as never,
      {} as never,
    );

    await expect(
      service.isJaringAllowed(
        {
          config: {
            userId: 'user-id',
            operationalAssignmentId: 'assignment-id',
            scopeAreaId: 'area-kota',
          },
        },
        ['area-kecamatan'],
      ),
    ).resolves.toBe(true);
  });

  it('mengizinkan satu koneksi WhatsApp untuk beberapa wilayah pilihan dalam assignment aktif', async () => {
    const prisma = {
      userProfile: {
        findUnique: jest.fn(() =>
          Promise.resolve({
            operationalAssignments: [
              {
                id: 'assignment-id',
                areaScopes: [{ areaId: 'area-provinsi' }],
              },
            ],
          }),
        ),
      },
      administrativeAreaClosure: {
        findFirst: jest
          .fn<() => Promise<{ ancestorId: string } | null>>()
          .mockResolvedValueOnce({ ancestorId: 'area-provinsi' })
          .mockResolvedValueOnce({ ancestorId: 'area-provinsi' })
          .mockResolvedValueOnce({ ancestorId: 'area-kota-b' }),
      },
    };
    const service = new WhatsAppChannelScopeService(
      prisma as never,
      {} as never,
    );

    await expect(
      service.isJaringAllowed(
        {
          config: {
            userId: 'user-id',
            operationalAssignmentId: 'assignment-id',
            scopeAreaIds: ['area-kota-a', 'area-kota-b', 'area-kota-a'],
          },
        },
        ['area-kecamatan-b'],
      ),
    ).resolves.toBe(true);
    expect(prisma.administrativeAreaClosure.findFirst).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        where: expect.objectContaining({
          ancestorId: { in: ['area-kota-a', 'area-kota-b'] },
          descendantId: { in: ['area-kecamatan-b'] },
        }),
      }),
    );
  });
});
