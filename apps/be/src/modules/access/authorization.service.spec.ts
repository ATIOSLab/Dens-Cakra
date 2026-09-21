import { jest } from '@jest/globals';
import {
  AuthorizationService,
  invalidateUserAuthorization,
} from './authorization.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

describe('AuthorizationService', () => {
  const mockUserPayload = {
    id: 'user-auth-123',
    role: 'executive',
    banned: false,
    profile: {
      id: 'profile-123',
      status: 'ACTIVE',
      isActive: true,
      deletedAt: null,
      operationalLockedAt: null,
      operationalLockReason: null,
      operationalLockedUntil: null,
      operationalAssignments: [
        {
          id: 'assign-123',
          branch: 'PUSAT',
          role: {
            code: 'EXECUTIVE',
            name: 'Pimpinan Eksekutif',
            isActive: true,
            rolePermissions: [{ permission: { code: 'EXEC_VIEW' } }],
          },
          areaScopes: [
            {
              isPrimary: true,
              area: {
                id: 'area-nat-1',
                code: 'ID',
                name: 'Indonesia',
                level: 'COUNTRY',
              },
            },
          ],
        },
      ],
    },
  };

  beforeEach(() => {
    invalidateUserAuthorization();
  });

  afterEach(() => {
    invalidateUserAuthorization();
    jest.restoreAllMocks();
  });

  it('resolves authorization context and caches on subsequent calls', async () => {
    const userFindUnique = jest
      .fn()
      .mockResolvedValue(mockUserPayload as never);
    const prisma = {
      user: {
        findUnique: userFindUnique,
      },
    } as unknown as PrismaService;
    const service = new AuthorizationService(prisma);

    const input = {
      authUserId: 'user-auth-123',
      authRole: 'executive',
    };

    const ctx1 = await service.authorize(input);
    expect(ctx1.authUserId).toBe('user-auth-123');
    expect(ctx1.authRole).toBe('executive');
    expect(ctx1.roleCode).toBe('EXECUTIVE');
    expect(userFindUnique).toHaveBeenCalledTimes(1);

    // Call again with same user
    const ctx2 = await service.authorize(input);
    expect(ctx2).toEqual(ctx1);
    // Did NOT call userFindUnique again — cached!
    expect(userFindUnique).toHaveBeenCalledTimes(1);
  });

  it('re-queries when cache is invalidated', async () => {
    const userFindUnique = jest
      .fn()
      .mockResolvedValue(mockUserPayload as never);
    const prisma = {
      user: {
        findUnique: userFindUnique,
      },
    } as unknown as PrismaService;
    const service = new AuthorizationService(prisma);

    const input = {
      authUserId: 'user-auth-123',
      authRole: 'executive',
    };

    await service.authorize(input);
    expect(userFindUnique).toHaveBeenCalledTimes(1);

    invalidateUserAuthorization('user-auth-123');

    await service.authorize(input);
    expect(userFindUnique).toHaveBeenCalledTimes(2);
  });
});
