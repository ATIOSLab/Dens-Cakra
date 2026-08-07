import { jest } from '@jest/globals';
import type { CreateJaringDto, UpdateJaringDto } from './jaring.dto.js';
import { JaringService } from './jaring.service.js';

describe('JaringService registration security', () => {
  const newJaring: CreateJaringDto = {
    aliasName: 'Merpati',
    whatsappNumber: '081234567890',
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

    await service.list({ limit: 100 }, {
      authRole: 'field_officer',
      primaryAssignmentId: 'assignment-id',
    } as never);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            {
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
            },
          ]),
        }),
      }),
    );
  });

  it('mengambil halaman Jaring berikutnya dengan offset yang sesuai', async () => {
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

    await service.list({ page: 3, limit: 100 }, {
      authRole: 'field_coordinator',
      primaryAssignmentId: 'assignment-id',
    } as never);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 200,
        take: 100,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('mengembalikan ringkasan kartu dari scope dan filter yang sama', async () => {
    const service = new JaringService(
      {
        jaring: {
          findMany: jest.fn(() => Promise.resolve([])),
          count: jest.fn(() => Promise.resolve(3)),
          groupBy: jest.fn(() =>
            Promise.resolve([
              { registrationStatus: 'PENDING', _count: { _all: 2 } },
              { registrationStatus: 'APPROVED', _count: { _all: 3 } },
              { registrationStatus: 'REJECTED', _count: { _all: 1 } },
            ]),
          ),
        },
      } as never,
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

    await expect(
      service.list(
        {
          limit: 10,
          paginated: true,
          registrationStatus: 'APPROVED',
        } as never,
        {
          authRole: 'field_officer',
          primaryAssignmentId: 'assignment-id',
        } as never,
      ),
    ).resolves.toMatchObject({
      pagination: { total: 3 },
      summary: { total: 6, pending: 2, approved: 3, rejected: 1 },
    });
  });

  it('menolak tanggal bergabung sebelum tanggal lahir', async () => {
    const service = new JaringService(
      {
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
      message:
        'Tanggal bergabung harus valid, tidak boleh sebelum tanggal lahir, dan tidak boleh di masa depan.',
    });
  });

  it('memastikan Jaring yang diedit berada di cakupan Field Officer', async () => {
    const accessError = new Error(
      'Jaring berada di luar cakupan Field Officer.',
    );
    const assertJaring = jest.fn(() => Promise.reject(accessError));
    const findUniqueOrThrow = jest.fn();
    const service = new JaringService(
      { jaring: { findUniqueOrThrow } } as never,
      { assertJaring } as never,
    );
    const context = {
      authRole: 'field_officer',
      primaryAssignmentId: 'assignment-id',
    } as never;

    await expect(
      service.update('jaring-id', {} as UpdateJaringDto, context),
    ).rejects.toBe(accessError);

    expect(assertJaring).toHaveBeenCalledWith(context, 'jaring-id');
    expect(findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('mengizinkan pengosongan NIK saat memperbarui Jaring', async () => {
    const update = jest.fn(() => Promise.resolve({}));
    const findUniqueOrThrow = jest.fn(() =>
      Promise.resolve({
        registrationStatus: 'PENDING',
        whatsappNumber: '6281234567890',
        nationalIdNumber: '3171000000000001',
      }),
    );
    const service = new JaringService(
      {
        jaring: {
          findUniqueOrThrow,
          findFirstOrThrow: jest.fn(() => Promise.resolve({ id: 'jaring-id' })),
          update,
        },
        auditLog: { create: jest.fn(() => Promise.resolve({})) },
      } as never,
      {
        assertJaring: jest.fn(() => Promise.resolve()),
      } as never,
    );

    await service.update(
      'jaring-id',
      { nationalIdNumber: '' } as UpdateJaringDto,
      {
        authRole: 'field_officer',
        primaryAssignmentId: 'assignment-id',
      } as never,
    );

    expect(update).toHaveBeenCalledWith({
      where: { id: 'jaring-id' },
      data: expect.objectContaining({
        nationalIdNumber: null,
      }),
    });
  });

  it('menolak nomor Jaring yang terdaftar di bawah Field Officer lain', async () => {
    const prisma = {
      jaring: {
        findFirst: jest.fn(() =>
          Promise.resolve({
            id: 'existing-jaring-id',
            aliasName: 'Z01001',
            fullName: 'Jaring Terdaftar',
            caretakerAssignments: [
              { fieldOfficerAssignmentId: 'other-field-officer-id' },
            ],
          }),
        ),
        create: jest.fn(),
      },
      jaringOccupation: {
        findUnique: jest.fn(() => Promise.resolve({ isActive: true })),
      },
      userOperationalAssignment: { findUniqueOrThrow: jest.fn() },
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
      message:
        'Nomor WhatsApp sama dengan Jaring aktif Jaring Terdaftar (alias Z01001) di bawah Field Officer lain.',
    });
    expect(prisma.jaring.findFirst).toHaveBeenCalledWith({
      where: {
        whatsappNumber: '6281234567890',
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: {
        id: true,
        aliasName: true,
        fullName: true,
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
            aliasName: 'Z01001',
            fullName: 'Jaring Terdaftar',
            caretakerAssignments: [
              {
                fieldOfficerAssignmentId: newJaring.fieldOfficerAssignmentId,
              },
            ],
          }),
        ),
        create: jest.fn(),
      },
      jaringOccupation: {
        findUnique: jest.fn(() => Promise.resolve({ isActive: true })),
      },
      userOperationalAssignment: { findUniqueOrThrow: jest.fn() },
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
      message:
        'Nomor WhatsApp sama dengan Jaring aktif Jaring Terdaftar (alias Z01001) di bawah Field Officer ini.',
    });
    expect(prisma.jaring.create).not.toHaveBeenCalled();
  });

  it('menolak persetujuan Jaring jika nomor WhatsApp sudah aktif pada Jaring lain', async () => {
    const update = jest.fn();
    const findUniqueOrThrow = jest.fn(() =>
      Promise.resolve({
        registrationStatus: 'PENDING',
        whatsappNumber: '6281234567890',
      }),
    );
    const findFirst = jest.fn(() =>
      Promise.resolve({
        id: 'active-jaring-id',
        aliasName: 'Z01001',
        fullName: 'Jaring Aktif',
      }),
    );
    const auditCreate = jest.fn();
    const assertJaring = jest.fn(() => Promise.resolve());
    const service = new JaringService(
      {
        jaring: { findUniqueOrThrow, findFirst, update },
        auditLog: { create: auditCreate },
      } as never,
      { assertJaring } as never,
    );

    await expect(
      service.approveRegistration('pending-jaring-id', {
        primaryAssignmentId: 'reviewer-assignment-id',
      } as never),
    ).rejects.toMatchObject({
      code: 'JARING_WHATSAPP_ACTIVE_DUPLICATE',
      message:
        'Nomor WhatsApp sama dengan Jaring aktif Jaring Aktif (alias Z01001). Gunakan nomor berbeda atau tolak pengajuan jika data ini duplikat.',
    });

    expect(assertJaring).toHaveBeenCalledWith(
      expect.anything(),
      'pending-jaring-id',
    );
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        whatsappNumber: '6281234567890',
        status: 'ACTIVE',
        deletedAt: null,
        id: { not: 'pending-jaring-id' },
      },
      select: {
        id: true,
        aliasName: true,
        fullName: true,
      },
    });
    expect(update).not.toHaveBeenCalled();
    expect(auditCreate).not.toHaveBeenCalled();
  });

  it('menolak pembuatan Jaring jika NIK sudah dipakai Jaring lain', async () => {
    const prisma = {
      jaring: {
        findFirst: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({
          id: 'existing-jaring-id',
          aliasName: 'V02068',
          fullName: 'Jaring Dengan NIK Sama',
        }),
        create: jest.fn(),
      },
      jaringOccupation: {
        findUnique: jest.fn(() => Promise.resolve({ isActive: true })),
      },
      userOperationalAssignment: { findUniqueOrThrow: jest.fn() },
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
      code: 'JARING_NIK_DUPLICATE',
      message:
        'NIK sama dengan Jaring Jaring Dengan NIK Sama (alias V02068). Gunakan NIK berbeda atau tolak pengajuan jika data ini duplikat.',
    });

    expect(prisma.jaring.findFirst).toHaveBeenLastCalledWith({
      where: {
        nationalIdNumber: newJaring.nationalIdNumber,
        deletedAt: null,
      },
      select: {
        id: true,
        aliasName: true,
        fullName: true,
      },
    });
    expect(prisma.jaring.create).not.toHaveBeenCalled();
  });

  it('menolak persetujuan Jaring jika NIK sudah dipakai Jaring lain', async () => {
    const update = jest.fn();
    const findUniqueOrThrow = jest.fn(() =>
      Promise.resolve({
        registrationStatus: 'PENDING',
        whatsappNumber: '6281234567890',
        nationalIdNumber: '3171000000000001',
      }),
    );
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'existing-jaring-id',
        aliasName: 'V02068',
        fullName: 'Jaring Dengan NIK Sama',
      });
    const auditCreate = jest.fn();
    const assertJaring = jest.fn(() => Promise.resolve());
    const service = new JaringService(
      {
        jaring: { findUniqueOrThrow, findFirst, update },
        auditLog: { create: auditCreate },
      } as never,
      { assertJaring } as never,
    );

    await expect(
      service.approveRegistration('pending-jaring-id', {
        primaryAssignmentId: 'reviewer-assignment-id',
      } as never),
    ).rejects.toMatchObject({
      code: 'JARING_NIK_DUPLICATE',
      message:
        'NIK sama dengan Jaring Jaring Dengan NIK Sama (alias V02068). Gunakan NIK berbeda atau tolak pengajuan jika data ini duplikat.',
    });

    expect(findFirst).toHaveBeenLastCalledWith({
      where: {
        nationalIdNumber: '3171000000000001',
        deletedAt: null,
        id: { not: 'pending-jaring-id' },
      },
      select: {
        id: true,
        aliasName: true,
        fullName: true,
      },
    });
    expect(update).not.toHaveBeenCalled();
    expect(auditCreate).not.toHaveBeenCalled();
  });

  it('membuat Jaring tanpa PIN individual dan tetap menghasilkan alias', async () => {
    const createdJaring = { id: 'new-jaring-id' };
    type JaringCreateInput = {
      data: { aliasName: string };
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
      jaringAreaCoverage: {
        count: jest.fn(() => Promise.resolve(0)),
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
      userOperationalAssignment: {
        findUniqueOrThrow: jest.fn(() =>
          Promise.resolve({
            isActive: true,
            role: { code: 'FIELD_OFFICER' },
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
    expect(createInput.data).not.toHaveProperty('code');
    expect(createInput.data.aliasName).toMatch(/^[0-9A-F]{8}(01|08)\d{4}$/);
    expect(createInput.data.address).toBe(
      'Jl. Tebet Timur Dalam No. 10, Jakarta Selatan',
    );
    expect(prisma.jaring.findFirst).toHaveBeenCalledTimes(3);
  });

  it('mengembalikan status Jaring APPROVED ke PENDING dan INACTIVE saat di-update oleh Field Officer', async () => {
    const update = jest.fn(() => Promise.resolve({}));
    const findUniqueOrThrow = jest.fn(() =>
      Promise.resolve({ registrationStatus: 'APPROVED' }),
    );
    const findFirstOrThrow = jest.fn(() =>
      Promise.resolve({
        id: 'jaring-id',
        registrationStatus: 'PENDING',
        status: 'INACTIVE',
      }),
    );
    const auditCreate = jest.fn(() => Promise.resolve({}));
    const assertJaring = jest.fn(() => Promise.resolve());
    const service = new JaringService(
      {
        jaring: {
          update,
          findUniqueOrThrow,
          findFirstOrThrow,
          findFirst: jest.fn(() => Promise.resolve(null)),
        },
        auditLog: { create: auditCreate },
      } as never,
      { assertJaring } as never,
    );

    await service.update('jaring-id', { fullName: 'Nama Jaring Diubah' }, {
      userProfileId: 'profile-id',
      primaryAssignmentId: 'assignment-id',
    } as never);

    expect(update).toHaveBeenCalledWith({
      where: { id: 'jaring-id' },
      data: expect.objectContaining({
        fullName: 'Nama Jaring Diubah',
        registrationStatus: 'PENDING',
        status: 'INACTIVE',
        deactivatedAt: expect.any(Date),
        rejectionReason: null,
        reviewedAt: null,
        reviewedByAssignmentId: null,
      }),
    });
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'JARING.UPDATE',
        entityId: 'jaring-id',
      }),
    });
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

  it('menampilkan laporan yang pernah dibuat oleh Jaring dengan pagination', async () => {
    const assertJaring = jest.fn(() => Promise.resolve());
    const findMany = jest.fn(() =>
      Promise.resolve([
        {
          id: 'report-session-id',
          jaringId: 'jaring-id',
          currentState: 'SUBMITTED',
          status: 'SUBMITTED',
          content: 'Aktivitas meningkat pada pagi hari di pasar utama',
          latitude: '1.2345678',
          longitude: '104.1234567',
          locationAccuracyMeters: '8.5',
          locationCapturedAt: new Date('2026-07-31T01:00:00.000Z'),
          locationType: 'live',
          locationMessageId: 'location-message-id',
          timezone: 'Asia/Jakarta',
          referenceNumber: 'DC-20260731-0001',
          startedAt: new Date('2026-07-31T00:00:00.000Z'),
          lastActivityAt: new Date('2026-07-31T01:10:00.000Z'),
          expiresAt: new Date('2026-08-01T01:10:00.000Z'),
          submittedAt: new Date('2026-07-31T01:10:00.000Z'),
          closedAt: null,
          createdAt: new Date('2026-07-31T00:00:00.000Z'),
          updatedAt: new Date('2026-07-31T01:10:00.000Z'),
          submittedMessage: {
            id: 'message-id',
            referenceNumber: 'DC-20260731-0001',
            content: 'Aktivitas meningkat pada pagi hari di pasar utama',
            status: 'RECEIVED',
            validationSummary: 'NOT_CHECKED',
            receivedAt: new Date('2026-07-31T01:10:00.000Z'),
            category: {
              id: 'category-id',
              code: 'SITUASI',
              name: 'Situasi',
            },
            resolvedArea: null,
            convertedBaketId: 'baket-id',
            convertedBaket: {
              id: 'baket-id',
              status: 'DRAFT',
              currentVersionNumber: 1,
              reportCategory: {
                id: 'category-id',
                code: 'SITUASI',
                name: 'Situasi',
              },
              versions: [
                {
                  id: 'version-id',
                  versionNumber: 1,
                  originalContent:
                    'Aktivitas meningkat pada pagi hari di pasar utama',
                  urgency: 'MEDIUM',
                  createdAt: new Date('2026-07-31T01:10:00.000Z'),
                  coverageValidationStatus: 'PENDING',
                  eventArea: null,
                },
              ],
            },
            _count: { media: 2, reportAmendments: 1 },
          },
          contentParts: [
            {
              id: 'part-id',
              externalMessageId: 'text-message-id',
              content: 'Aktivitas meningkat pada pagi hari di pasar utama',
              createdAt: new Date('2026-07-31T00:45:00.000Z'),
            },
          ],
          media: [
            {
              id: 'report-media-id',
              externalMessageId: 'media-message-id',
              fileId: 'file-id',
              mediaType: 'PHOTO',
              caption: 'Dokumentasi pasar',
              createdAt: new Date('2026-07-31T00:50:00.000Z'),
              file: {
                id: 'file-id',
                originalName: 'pasar.jpg',
                mimeType: 'image/jpeg',
              },
            },
          ],
          _count: { contentParts: 1, media: 2, amendments: 1 },
        },
      ]),
    );
    const count = jest.fn(() => Promise.resolve(1));
    const groupBy = jest.fn(() =>
      Promise.resolve([{ status: 'SUBMITTED', _count: { _all: 1 } }]),
    );
    const service = new JaringService(
      {
        whatsAppReportSession: { findMany, count, groupBy },
      } as never,
      { assertJaring } as never,
    );
    const context = {
      authRole: 'field_officer',
      primaryAssignmentId: 'assignment-id',
    } as never;

    const result = await service.reports(
      'jaring-id',
      { page: 2, limit: 10, status: 'SUBMITTED' } as never,
      context,
    );

    expect(assertJaring).toHaveBeenCalledWith(context, 'jaring-id');
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { jaringId: 'jaring-id', status: 'SUBMITTED' },
        skip: 10,
        take: 10,
      }),
    );
    expect(count).toHaveBeenCalledWith({
      where: { jaringId: 'jaring-id', status: 'SUBMITTED' },
    });
    expect(result.pagination.total).toBe(1);
    expect(result.facets.status.SUBMITTED).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: 'report-session-id',
      referenceNumber: 'DC-20260731-0001',
      reportCategory: { id: 'category-id', name: 'Situasi' },
      baket: { id: 'baket-id', currentVersionNumber: 1 },
      counts: { contentParts: 1, media: 2, amendments: 1 },
      displayTitle: 'Aktivitas meningkat pada pagi hari di…',
      reportedAt: new Date('2026-07-31T01:10:00.000Z'),
    });
    expect(result.items[0].messages.map((item) => item.kind)).toEqual([
      'TEXT',
      'IMAGE',
      'LIVE_LOCATION',
    ]);
    expect(result.items[0].location).toMatchObject({
      latitude: 1.2345678,
      longitude: 104.1234567,
      accuracyMeters: 8.5,
    });
  });

  it('menghitung ringkasan laporan tanpa double counting Baket', async () => {
    const findMany = jest.fn(() => Promise.resolve([]));
    const count = jest
      .fn<() => Promise<number>>()
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    const groupBy = jest.fn(() => Promise.resolve([]));
    const jaringWhere = jest.fn(() =>
      Promise.resolve({ id: { in: ['jaring-id'] } }),
    );
    const service = new JaringService(
      {
        whatsAppReportSession: { findMany, count, groupBy },
      } as never,
      { jaringWhere } as never,
      {} as never,
    );

    const result = await service.allReports(
      { page: 1, limit: 100, stage: 'JARING_REPORT' } as never,
      {
        authRole: 'field_officer',
        primaryAssignmentId: 'assignment-id',
      } as never,
    );

    expect(jaringWhere).toHaveBeenCalledTimes(1);
    expect(count).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({ AND: expect.any(Array) }),
      }),
    );
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            {
              submittedMessage: { is: { convertedBaketId: null } },
            },
          ]),
        }),
      }),
    );
    expect(count).toHaveBeenNthCalledWith(3, {
      where: {
        AND: [
          expect.any(Object),
          {
            submittedMessage: { is: { convertedBaketId: null } },
          },
        ],
      },
    });
    expect(count).toHaveBeenNthCalledWith(5, {
      where: {
        AND: [
          expect.any(Object),
          {
            submittedMessage: {
              is: {
                convertedBaketId: { not: null },
                validationSummary: 'VALID',
              },
            },
          },
        ],
      },
    });
    expect(result.summary).toEqual({
      totalSessions: 3,
      totalJaringReports: 2,
      completeJaringReports: 1,
      incompleteJaringReports: 1,
      baketReports: 1,
      verifiedJaringReports: 1,
      waitingVerificationReports: 1,
    });
    expect(result.summary.totalJaringReports).toBe(
      result.summary.completeJaringReports +
        result.summary.incompleteJaringReports,
    );
    expect(result.summary.baketReports).toBe(1);
  });

  it('menerapkan filter laporan pada seluruh dataset dan sorting stabil', async () => {
    const findMany = jest.fn(() => Promise.resolve([]));
    const count = jest.fn(() => Promise.resolve(0));
    const groupBy = jest.fn(() => Promise.resolve([]));
    const jaringWhere = jest.fn(() =>
      Promise.resolve({ id: { in: ['jaring-id'] } }),
    );
    const service = new JaringService(
      {
        whatsAppReportSession: { findMany, count, groupBy },
      } as never,
      { jaringWhere } as never,
      {} as never,
    );

    await service.allReports(
      {
        page: 2,
        limit: 25,
        search: '0812-3456-7890',
        verificationStatus: 'VERIFIED',
        areaId: '247c7732-44df-4f4a-bf50-f80c81245205',
        fieldOfficerAssignmentId: '00000000-0000-4000-8000-000000000101',
        workflowStatus: 'READY_TO_SEND',
        coordinateSource: 'WHATSAPP_LOCATION',
        hasAttachment: 'true',
        sortBy: 'reportedAt',
        sortOrder: 'desc',
      },
      { authRole: 'field_officer' } as never,
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 25,
        take: 25,
        orderBy: [
          { submittedAt: { sort: 'desc', nulls: 'last' } },
          { startedAt: 'desc' },
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
        where: {
          AND: expect.arrayContaining([
            { jaring: { id: { in: ['jaring-id'] } } },
            { media: { some: { deletedAt: null } } },
            {
              fieldOfficerAssignmentId: '00000000-0000-4000-8000-000000000101',
            },
            {
              submittedMessage: {
                is: {
                  convertedBaket: { is: { status: 'READY_TO_SEND' } },
                },
              },
            },
            {
              submittedMessage: {
                is: { coordinateSource: 'WHATSAPP_LOCATION' },
              },
            },
            {
              submittedMessage: {
                is: { validationSummary: 'VALID' },
              },
            },
          ]),
        },
      }),
    );
  });

  it('memuat laporan pembinaan global dengan scope, filter, dan pagination server', async () => {
    const findMany = jest.fn(() => Promise.resolve([]));
    const count = jest.fn(() => Promise.resolve(0));
    const groupBy = jest.fn(() => Promise.resolve([]));
    const jaringWhere = jest.fn(() =>
      Promise.resolve({ id: { in: ['jaring-id'] } }),
    );
    const service = new JaringService(
      {
        jaringCoachingReport: { findMany, count, groupBy },
      } as never,
      { jaringWhere } as never,
      {} as never,
    );

    const result = await service.allCoachingReports(
      {
        page: 3,
        limit: 10,
        search: 'pembinaan',
        areaId: '247c7732-44df-4f4a-bf50-f80c81245205',
        sortBy: 'title',
        sortOrder: 'asc',
      },
      { authRole: 'field_coordinator' } as never,
    );

    expect(jaringWhere).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
        orderBy: [
          { title: 'asc' },
          { reportedAt: 'desc' },
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
        where: expect.objectContaining({
          jaring: expect.objectContaining({
            id: { in: ['jaring-id'] },
            areaCoverages: expect.any(Object),
          }),
          OR: expect.any(Array),
        }),
      }),
    );
    expect(result.pagination).toEqual({
      page: 3,
      limit: 10,
      total: 0,
      totalPages: 1,
    });
    expect(result.summary).toEqual({
      total: 0,
      uniqueJaringCount: 0,
      thisMonthCount: 0,
    });
  });

  it('memverifikasi laporan Jaring dan mengubah status tampilan menjadi verified', async () => {
    const assertJaring = jest.fn(() => Promise.resolve());
    const reportSession = {
      id: 'report-session-id',
      jaringId: 'jaring-id',
      currentState: 'SUBMITTED',
      status: 'SUBMITTED',
      content: 'Aktivitas meningkat pada pagi hari.',
      latitude: null,
      longitude: null,
      locationAccuracyMeters: null,
      locationCapturedAt: null,
      locationType: null,
      timezone: 'Asia/Jakarta',
      referenceNumber: 'DC-20260731-0001',
      startedAt: new Date('2026-07-31T00:00:00.000Z'),
      lastActivityAt: new Date('2026-07-31T01:10:00.000Z'),
      expiresAt: new Date('2026-08-01T01:10:00.000Z'),
      submittedAt: new Date('2026-07-31T01:10:00.000Z'),
      closedAt: null,
      createdAt: new Date('2026-07-31T00:00:00.000Z'),
      updatedAt: new Date('2026-07-31T01:10:00.000Z'),
      submittedMessage: {
        id: 'message-id',
        referenceNumber: 'DC-20260731-0001',
        title: 'Laporan Situasi Pasar',
        content: 'Aktivitas meningkat pada pagi hari.',
        status: 'READY_FOR_BAKET',
        validationSummary: 'VALID',
        receivedAt: new Date('2026-07-31T01:10:00.000Z'),
        category: null,
        resolvedArea: null,
        convertedBaketId: null,
        convertedBaket: null,
        _count: { media: 1, reportAmendments: 0 },
      },
      _count: { contentParts: 1, media: 1, amendments: 0 },
    };
    const sourceSession = {
      id: 'report-session-id',
      jaringId: 'jaring-id',
      currentState: 'SUBMITTED',
      submittedMessage: {
        id: 'message-id',
        title: 'Laporan Situasi Pasar',
        content: 'Aktivitas meningkat pada pagi hari.',
        senderPhone: '6281234567890',
        jaringId: 'jaring-id',
        receivedAt: new Date('2026-07-31T01:10:00.000Z'),
        latitude: '1.2345678',
        longitude: '104.1234567',
        resolvedAreaId: 'area-id',
        rawPayload: { photoMessageId: 'photo-id' },
        media: [{ messageId: 'message-id', fileId: 'file-id' }],
        validationIssues: [],
        convertedBaketId: null,
        categoryId: null,
        status: 'RECEIVED',
        validationSummary: 'NOT_CHECKED',
      },
    };
    const tx = {
      whatsAppValidationIssue: {
        deleteMany: jest.fn(() => Promise.resolve({ count: 0 })),
        createMany: jest.fn(() => Promise.resolve({ count: 0 })),
      },
      whatsAppMessage: { update: jest.fn(() => Promise.resolve({})) },
      whatsAppReportHistory: {
        create: jest.fn(() => Promise.resolve({})),
      },
      auditLog: { create: jest.fn(() => Promise.resolve({})) },
    };
    const transaction = jest.fn((callback: (client: typeof tx) => unknown) =>
      Promise.resolve(callback(tx)),
    );
    const findUnique = jest
      .fn()
      .mockResolvedValueOnce(sourceSession)
      .mockResolvedValueOnce(reportSession);
    const service = new JaringService(
      {
        $transaction: transaction,
        whatsAppReportSession: { findUnique },
      } as never,
      { assertJaring } as never,
    );

    const result = await service.verifyReport(
      'report-session-id',
      { note: 'Valid' },
      {
        userProfileId: 'profile-id',
        primaryAssignmentId: 'assignment-id',
      } as never,
    );

    expect(assertJaring).toHaveBeenCalledWith(expect.anything(), 'jaring-id');
    expect(tx.whatsAppMessage.update).toHaveBeenCalledWith({
      where: { id: 'message-id' },
      data: { validationSummary: 'VALID', status: 'READY_FOR_BAKET' },
    });
    expect(tx.whatsAppReportHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'FIELD_OFFICER_VERIFIED',
        }),
      }),
    );
    expect(result.verificationStatus).toBe('VERIFIED_BY_FIELD_OFFICER');
    expect(result.canFillMetadata).toBe(true);
  });

  it('menggabungkan history laporan dan audit log untuk pembanding perubahan', async () => {
    const assertJaring = jest.fn(() => Promise.resolve());
    const reportCreatedAt = new Date('2026-07-31T02:00:00.000Z');
    const auditCreatedAt = new Date('2026-07-31T03:00:00.000Z');
    const service = new JaringService(
      {
        whatsAppReportSession: {
          findUnique: jest.fn(() =>
            Promise.resolve({ id: 'report-session-id', jaringId: 'jaring-id' }),
          ),
        },
        whatsAppReportHistory: {
          findMany: jest.fn(() =>
            Promise.resolve([
              {
                id: 'history-id',
                action: 'FIELD_OFFICER_METADATA_UPDATED',
                previousState: 'SUBMITTED',
                newState: 'SUBMITTED',
                externalMessageId: null,
                metadata: { before: { urgency: 'NORMAL' } },
                createdAt: reportCreatedAt,
              },
            ]),
          ),
        },
        auditLog: {
          findMany: jest.fn(() =>
            Promise.resolve([
              {
                id: 'audit-id',
                action: 'JARING_REPORT.METADATA.UPDATE',
                actorUserProfileId: 'profile-id',
                actorAssignmentId: 'assignment-id',
                beforeData: { urgency: 'NORMAL' },
                afterData: { urgency: 'HIGH' },
                metadata: { versionChanged: true },
                createdAt: auditCreatedAt,
              },
            ]),
          ),
        },
      } as never,
      { assertJaring } as never,
    );

    const result = await service.reportHistory('report-session-id', {
      primaryAssignmentId: 'assignment-id',
    } as never);

    expect(assertJaring).toHaveBeenCalledWith(expect.anything(), 'jaring-id');
    expect(result.events).toHaveLength(2);
    expect(result.events[0]).toMatchObject({
      id: 'audit-id',
      source: 'audit_log',
      afterData: { urgency: 'HIGH' },
    });
    expect(result.events[1]).toMatchObject({
      id: 'history-id',
      source: 'report_history',
    });
  });
});
