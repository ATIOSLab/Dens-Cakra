import { jest } from '@jest/globals';
import { ApiException } from '../../common/api/api-exception.js';
import { JaringService } from './jaring.service.js';

describe('JaringService registration security', () => {
  const newJaring = {
    code: 'JRG-NEW',
    whatsappNumber: '081234567890',
    fieldOfficerAssignmentId: '8ba6a135-9aef-43d3-a7c9-086eb4575f79',
    areaIds: ['247c7732-44df-4f4a-bf50-f80c81245205'],
  };

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
      userSeatAssignment: { findUniqueOrThrow: jest.fn() },
    };
    const service = new JaringService(prisma as never, {} as never);
    const create = service.create(newJaring, {
      primaryAssignmentId: 'creator-assignment-id',
    } as never);

    await expect(create).rejects.toMatchObject<ApiException>({
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
      userSeatAssignment: { findUniqueOrThrow: jest.fn() },
    };
    const service = new JaringService(prisma as never, {} as never);

    await expect(
      service.create(newJaring, {
        primaryAssignmentId: 'creator-assignment-id',
      } as never),
    ).rejects.toMatchObject<ApiException>({
      code: 'JARING_WHATSAPP_DUPLICATE',
      message: 'Nomor Jaring telah terdaftar di bawah Field Officer ini.',
    });
    expect(prisma.jaring.create).not.toHaveBeenCalled();
  });
});
