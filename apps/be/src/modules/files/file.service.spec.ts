import { jest } from '@jest/globals';
import { FileService } from './file.service.js';
import {
  FileLifecycleStatus,
  FileType,
} from '../../generated/prisma/client.js';
import { env } from '../../lib/env.js';

describe('FileService scanning & lifecycle', () => {
  it('marks file as CLEAN when scanner is unavailable and scanRequired is false', async () => {
    const updateMock = jest.fn(() =>
      Promise.resolve({ id: 'file-1', storageKey: 'test-key' }),
    );
    const prisma = {
      fileAsset: {
        update: updateMock,
      },
    };
    const storage = {
      createToken: jest.fn(() => 'test-token'),
      verifyToken: jest.fn(() => ({ storageKey: 'test-key' })),
      openReadStream: jest.fn(() => ({ destroy: jest.fn() })),
    };
    const handlers = {
      register: jest.fn(),
    };

    (env.storage as { scanRequired: boolean }).scanRequired = false;

    const service = new FileService(
      prisma as never,
      storage as never,
      handlers as never,
    );

    const result = await service.scanFile('file-1');

    expect(result).toEqual({ clean: true, skipped: true });
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'file-1' },
        data: expect.objectContaining({
          lifecycleStatus: FileLifecycleStatus.CLEAN,
          scanResult: expect.objectContaining({
            reason: 'clamscan_unavailable',
          }),
        }),
      }),
    );
  });

  it('marks file as QUARANTINED when scanner is unavailable and scanRequired is true (Fail-Closed)', async () => {
    const updateMock = jest.fn(() =>
      Promise.resolve({ id: 'file-2', storageKey: 'test-key' }),
    );
    const prisma = {
      fileAsset: {
        update: updateMock,
      },
    };
    const storage = {
      createToken: jest.fn(() => 'test-token'),
      verifyToken: jest.fn(() => ({ storageKey: 'test-key' })),
      openReadStream: jest.fn(() => ({ destroy: jest.fn() })),
    };
    const handlers = {
      register: jest.fn(),
    };

    (env.storage as { scanRequired: boolean }).scanRequired = true;

    const service = new FileService(
      prisma as never,
      storage as never,
      handlers as never,
    );

    const result = await service.scanFile('file-2');

    expect(result).toEqual({
      clean: false,
      quarantined: true,
      reason: 'clamscan_unavailable',
    });
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'file-2' },
        data: expect.objectContaining({
          lifecycleStatus: FileLifecycleStatus.QUARANTINED,
          quarantineReason: 'clamscan_unavailable',
        }),
      }),
    );

    // Reset back
    (env.storage as { scanRequired: boolean }).scanRequired = false;
  });

  it('blocks accessUrl for QUARANTINED file when scanRequired is true', async () => {
    const prisma = {
      fileAsset: {
        findFirst: jest.fn(() =>
          Promise.resolve({
            id: 'file-3',
            storageKey: 'key-3',
            fileType: FileType.PHOTO,
            mimeType: 'image/jpeg',
            lifecycleStatus: FileLifecycleStatus.QUARANTINED,
            quarantineReason: 'clamscan_unavailable',
            deletedAt: null,
          }),
        ),
      },
    };
    const storage = {
      createToken: jest.fn(),
    };
    const handlers = {
      register: jest.fn(),
    };

    (env.storage as { scanRequired: boolean }).scanRequired = true;

    const service = new FileService(
      prisma as never,
      storage as never,
      handlers as never,
    );

    await expect(
      service.accessUrl('file-3', 300, 'inline', {
        userProfileId: 'u1',
        primaryAssignmentId: 'a1',
      } as never),
    ).rejects.toThrow('File has not passed malware scanning.');

    // Reset back
    (env.storage as { scanRequired: boolean }).scanRequired = false;
  });
});
