import { jest } from '@jest/globals';
import type { CreateJaringDto } from './jaring.dto.js';
import { JaringService } from './jaring.service.js';

describe('JaringService registration security', () => {
  const newJaring: CreateJaringDto = {
    aliasName: 'Merpati',
    whatsappNumber: '081234567890',
    clusterId: 'a6b197bd-6b8f-4fae-a567-8e417218961a',
    fullName: 'Nama Jaring',
    nationalIdNumber: '3171000000000001',
    address: 'Jl. Tebet Timur Dalam No. 10, Jakarta Selatan',
    birthPlace: 'Jakarta',
    birthDate: '1990-01-01',
    gender: 'MALE',
    occupationId: '36ac29d1-9cab-4dd0-a86f-218be20d3b44',
    profilePhotoFileId: 'cbfa99dc-533f-441e-aa7a-ac2a9648dc54',
    joinedAt: '2020-01-01',
    notes: 'Bermanfaat untuk pemetaan dan pembinaan wilayah.',
    fieldOfficerAssignmentId: '8ba6a135-9aef-43d3-a7c9-086eb4575f79',
    areaIds: ['247c7732-44df-4f4a-bf50-f80c81245205'],
  };

  it('memfilter Jaring berdasarkan kelurahan turunan dari cakupan wilayah', async () => {
    const findMany = jest.fn(() => Promise.resolve([]));
    const service = new JaringService(
      { jaring: { findMany } } as never,
      {
        resolve: jest.fn(() =>
          Promise.resolve({
            organizationUnitId: 'unit-id',
            commandRouteType: 'BINDA',
            positionIds: ['position-id'],
            assignmentIds: ['assignment-id'],
            areaRootIds: ['district-id'],
          }),
        ),
      } as never,
    );

    await service.list(
      { limit: 100 },
      {
        authRole: 'field_officer',
        primaryAssignmentId: 'assignment-id',
      } as never,
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          areaCoverages: {
            some: {
              validUntil: null,
              area: {
                OR: [
                  { id: { in: ['district-id'] } },
                  {
                    descendantLinks: {
                      some: { ancestorId: { in: ['district-id'] } },
                    },
                  },
                ],
              },
            },
          },
        }),
      }),
    );
  });

  it('menolak tanggal bergabung sebelum tanggal lahir', async () => {
    const service = new JaringService(
      {
        jaringCluster: {
          findUnique: jest.fn(() => Promise.resolve({ isActive: true })),
        },
        jaringOccupation: {
          findUnique: jest.fn(() => Promise.resolve({ isActive: true })),
        },
      } as never,
      {} as never,
    );

    await expect(
      service.create({ ...newJaring, joinedAt: '1989-12-31' }, {
        primaryAssignmentId: newJaring.fieldOfficerAssignmentId,
      } as never),
    ).rejects.toMatchObject({
      code: 'JARING_JOIN_DATE_INVALID',
      message: 'Tanggal bergabung harus valid, tidak boleh sebelum tanggal lahir, dan tidak boleh di masa depan.',
    });
  });

  it('menolak nomor Jaring yang terdaftar di bawah Field Officer lain', async () => {
    const prisma = {
      jaring: {
        findFirst: jest.fn(() =>
          Promise.resolve({
            id: 'existing-jaring-id',
            caretakerAssignments: [
              { fieldOfficerAssignmentId: 'other-field-officer-id' },
            ],
          }),
        ),
        create: jest.fn(),
      },
      jaringCluster: {
        findUnique: jest.fn(() => Promise.resolve({ isActive: true })),
      },
      jaringOccupation: {
        findUnique: jest.fn(() => Promise.resolve({ isActive: true })),
      },
      userSeatAssignment: { findUniqueOrThrow: jest.fn() },
      administrativeArea: { count: jest.fn(() => Promise.resolve(1)) },
    };
    const service = new JaringService(
      prisma as never,
      {
        assertArea: jest.fn(() => Promise.resolve()),
      } as never,
    );
    const create = service.create(newJaring, {
      primaryAssignmentId: newJaring.fieldOfficerAssignmentId,
    } as never);

    await expect(create).rejects.toMatchObject({
      code: 'JARING_WHATSAPP_OWNED_BY_OTHER_OFFICER',
      message: 'Nomor Jaring telah terdaftar di bawah Field Officer lain.',
    });
    expect(prisma.jaring.findFirst).toHaveBeenCalledWith({
      where: {
        whatsappNumber: '6281234567890',
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: {
        id: true,
        caretakerAssignments: {
          where: { isActive: true, validUntil: null },
          take: 1,
          select: { fieldOfficerAssignmentId: true },
        },
      },
    });
    expect(prisma.jaring.create).not.toHaveBeenCalled();
  });

  it('menolak nomor Jaring yang sudah terdaftar pada Field Officer yang sama', async () => {
    const prisma = {
      jaring: {
        findFirst: jest.fn(() =>
          Promise.resolve({
            id: 'existing-jaring-id',
            caretakerAssignments: [
              {
                fieldOfficerAssignmentId: newJaring.fieldOfficerAssignmentId,
              },
            ],
          }),
        ),
        create: jest.fn(),
      },
      jaringCluster: {
        findUnique: jest.fn(() => Promise.resolve({ isActive: true })),
      },
      jaringOccupation: {
        findUnique: jest.fn(() => Promise.resolve({ isActive: true })),
      },
      userSeatAssignment: { findUniqueOrThrow: jest.fn() },
      administrativeArea: { count: jest.fn(() => Promise.resolve(1)) },
    };
    const service = new JaringService(
      prisma as never,
      {
        assertArea: jest.fn(() => Promise.resolve()),
      } as never,
    );

    await expect(
      service.create(newJaring, {
        primaryAssignmentId: newJaring.fieldOfficerAssignmentId,
      } as never),
    ).rejects.toMatchObject({
      code: 'JARING_WHATSAPP_DUPLICATE',
      message: 'Nomor Jaring telah terdaftar di bawah Field Officer ini.',
    });
    expect(prisma.jaring.create).not.toHaveBeenCalled();
  });

  it('membuat PIN enam digit otomatis tanpa pemeriksaan duplikasi kode', async () => {
    const createdJaring = { id: 'new-jaring-id' };
    type JaringCreateInput = {
      data: { code: string; aliasName: string };
    };
    const prisma = {
      jaring: {
        findFirst: jest.fn(() => Promise.resolve(null)),
        findMany: jest.fn(() =>
          Promise.resolve([{ aliasName: 'Z01004' }, { aliasName: 'Z01999X' }]),
        ),
        create: jest.fn((input: JaringCreateInput) =>
          Promise.resolve(createdJaring),
        ),
        findFirstOrThrow: jest.fn(() => Promise.resolve(createdJaring)),
      },
      jaringCluster: {
        findUnique: jest.fn(() => Promise.resolve({ isActive: true })),
      },
      jaringOccupation: {
        findUnique: jest.fn(() => Promise.resolve({ isActive: true })),
      },
      fileAsset: {
        findFirst: jest.fn(() =>
          Promise.resolve({
            id: newJaring.profilePhotoFileId,
            mimeType: 'image/jpeg',
          }),
        ),
      },
      administrativeArea: {
        count: jest.fn(() => Promise.resolve(1)),
        findMany: jest.fn(() =>
          Promise.resolve([
            {
              id: newJaring.areaIds[0],
              code: '31.74.01.1001',
              officialCode: '31.74.01.1001',
              name: 'Tebet Timur',
              level: 'URBAN_VILLAGE',
              parent: {
                id: 'district-id',
                code: '31.74.01',
                officialCode: '31.74.01',
                name: 'Tebet',
                level: 'DISTRICT',
              },
            },
          ]),
        ),
      },
      userSeatAssignment: {
        findUniqueOrThrow: jest.fn(() =>
          Promise.resolve({
            isActive: true,
            position: { code: 'PETUGAS_ORGANIK' },
          }),
        ),
      },
      auditLog: { create: jest.fn(() => Promise.resolve({})) },
    };
    const service = new JaringService(
      prisma as never,
      {
        assertArea: jest.fn(() => Promise.resolve()),
      } as never,
    );

    await service.create(newJaring, {
      primaryAssignmentId: newJaring.fieldOfficerAssignmentId,
      userProfileId: 'profile-id',
    } as never);

    const createInput = prisma.jaring.create.mock.calls[0]?.[0];
    expect(createInput.data.code).toMatch(/^\d{6}$/);
    expect(createInput.data.aliasName).toBe('Z01005');
    expect(createInput.data.address).toBe(
      'Jl. Tebet Timur Dalam No. 10, Jakarta Selatan',
    );
    expect(prisma.jaring.findFirst).toHaveBeenCalledTimes(1);
  });

  it('melakukan soft delete dan menyimpan audit delete', async () => {
    const update = jest.fn(() => Promise.resolve({}));
    const findUniqueOrThrow = jest.fn(() =>
      Promise.resolve({ registrationStatus: 'APPROVED' }),
    );
    const findFirstOrThrow = jest.fn(() =>
      Promise.resolve({
        id: 'jaring-id',
        status: 'ARCHIVED',
        deletedAt: new Date(),
      }),
    );
    const auditCreate = jest.fn(() => Promise.resolve({}));
    const service = new JaringService(
      {
        jaring: { update, findUniqueOrThrow, findFirstOrThrow },
        auditLog: { create: auditCreate },
      } as never,
      {} as never,
    );

    await service.softDelete('jaring-id', { reason: 'Tidak lagi dibina' }, {
      userProfileId: 'profile-id',
      primaryAssignmentId: 'assignment-id',
    } as never);

    expect(update).toHaveBeenCalledWith({
      where: { id: 'jaring-id' },
      data: {
        status: 'ARCHIVED',
        deletedAt: expect.any(Date),
      },
    });
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'JARING.DELETE',
        entityType: 'Jaring',
        entityId: 'jaring-id',
        metadata: { reason: 'Tidak lagi dibina' },
      }),
    });
  });

  it('membuat ulang PIN enam digit dan menyimpan audit', async () => {
    type JaringUpdateInput = {
      data: { code: string };
    };
    const update = jest.fn((input: JaringUpdateInput) => Promise.resolve({}));
    const findFirstOrThrow = jest.fn(() =>
      Promise.resolve({ id: 'jaring-id', code: '123456' }),
    );
    const auditCreate = jest.fn(() => Promise.resolve({}));
    const assertJaring = jest.fn(() => Promise.resolve());
    const service = new JaringService(
      {
        jaring: { update, findFirstOrThrow },
        auditLog: { create: auditCreate },
      } as never,
      { assertJaring } as never,
    );

    await service.regeneratePin('jaring-id', {
      userProfileId: 'profile-id',
      primaryAssignmentId: 'assignment-id',
    } as never);

    expect(assertJaring).toHaveBeenCalledWith(expect.anything(), 'jaring-id');
    const updateInput = update.mock.calls[0]?.[0];
    expect(updateInput.data.code).toMatch(/^\d{6}$/);
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'JARING.PIN_REGENERATE',
        entityId: 'jaring-id',
      }),
    });
  });
});
