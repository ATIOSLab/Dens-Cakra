import { jest } from '@jest/globals';
import {
  AdministrativeLevel,
  CommandRouteType,
  RoleCode,
} from '../../generated/prisma/client.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { UserProfileService } from './user-profile.service.js';

const actor = {
  userProfileId: 'actor-profile',
  primaryAssignmentId: 'actor-assignment',
} as AuthorizationContext;

const targetProfile = {
  id: 'target-profile',
  authUserId: 'auth-user',
};

const dkiProvince = {
  id: 'dki',
  code: '31',
  officialCode: '31',
  name: 'Daerah Khusus Ibukota Jakarta',
  level: AdministrativeLevel.PROVINCE,
};

const jawaBaratProvince = {
  id: 'jabar',
  code: '32',
  officialCode: '32',
  name: 'Jawa Barat',
  level: AdministrativeLevel.PROVINCE,
};

function buildService(
  area: unknown,
  roleCode: RoleCode = RoleCode.REGIONAL_COMMANDER,
) {
  const areas = Array.isArray(area) ? area : [area];
  const createdAssignment = { id: 'new-assignment' };
  const tx = {
    userOperationalAssignment: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'old-assignment',
      } as never),
      update: jest.fn().mockResolvedValue({ id: 'old-assignment' } as never),
      create: jest.fn().mockResolvedValue(createdAssignment as never),
    },
    userAreaScope: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 } as never),
    },
    user: {
      update: jest.fn().mockResolvedValue({ id: 'auth-user' } as never),
    },
    session: {
      deleteMany: jest.fn().mockResolvedValue({ count: 1 } as never),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: 'audit' } as never),
    },
  };
  const prisma = {
    userProfile: {
      findFirst: jest.fn().mockResolvedValue(targetProfile as never),
    },
    role: {
      findUnique: jest.fn().mockResolvedValue({
        id: `role-${roleCode.toLowerCase()}`,
        code: roleCode,
        isActive: true,
      } as never),
    },
    administrativeArea: {
      findMany: jest.fn().mockResolvedValue(areas as never),
    },
    userOperationalAssignment: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'current-assignment',
        branch: CommandRouteType.DIRECTORATE,
        role: { code: roleCode },
      } as never),
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        id: 'new-assignment',
        role: { code: roleCode },
        areaScopes: areas.map((item) => ({ area: item })),
      } as never),
    },
    $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };

  return {
    service: new UserProfileService(prisma as never),
    prisma,
    tx,
  };
}

function input(
  areaId: string,
  roleCode: RoleCode = RoleCode.REGIONAL_COMMANDER,
) {
  return {
    reason: 'Perubahan cakupan supervisi DKI',
    roleCode,
    branch: CommandRouteType.DIRECTORATE,
    areaScopeIds: [areaId],
    effectiveAt: '2026-08-09T00:00:00.000Z',
  };
}

describe('UserProfileService Directorate/Ditwil DKI supervision scope', () => {
  it('lists DKI city/regency supervision mappings for admin panel', async () => {
    const jakartaSelatan = {
      id: 'jaksel',
      code: '31.74',
      officialCode: '31.74',
      name: 'Kota Administrasi Jakarta Selatan',
      level: AdministrativeLevel.CITY,
    };
    const jakartaPusat = {
      id: 'jakpus',
      code: '31.71',
      officialCode: '31.71',
      name: 'Kota Administrasi Jakarta Pusat',
      level: AdministrativeLevel.CITY,
    };
    const prisma = {
      administrativeArea: {
        findMany: jest
          .fn()
          .mockResolvedValue([jakartaPusat, jakartaSelatan] as never),
      },
      userOperationalAssignment: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'assignment-21',
            userProfileId: 'user-21',
            branch: CommandRouteType.DIRECTORATE,
            validFrom: new Date('2026-08-09T00:00:00.000Z'),
            role: { code: RoleCode.REGIONAL_COMMANDER, name: 'Direktur' },
            userProfile: {
              id: 'user-21',
              username: 'direktorat21',
              fullName: 'Direktorat 21',
              status: 'ACTIVE',
              authUser: {
                role: 'regional_commander',
                email: 'dit21@denscakra.local',
                banned: false,
              },
            },
            areaScopes: [
              {
                areaId: 'jaksel',
                isPrimary: true,
                area: jakartaSelatan,
              },
            ],
          },
        ] as never),
      },
    };
    const service = new UserProfileService(prisma as never);

    const result = await service.dkiSupervisionMappings();

    expect(result.summary).toEqual({
      totalCities: 2,
      assignedCities: 1,
      unassignedCities: 1,
      directorateUsers: 1,
    });
    expect(result.assignments[0]).toMatchObject({
      userProfileId: 'user-21',
      dkiAreaIds: ['jaksel'],
    });
  });

  it('allows DKI city/regency supervision to be shared by multiple Directorate/Ditwil users', async () => {
    const jakartaSelatan = {
      id: 'jaksel',
      code: '31.74',
      officialCode: '31.74',
      name: 'Kota Administrasi Jakarta Selatan',
      level: AdministrativeLevel.CITY,
      ancestorLinks: [{ ancestor: dkiProvince }],
    };
    const { service, tx } = buildService(jakartaSelatan);

    await expect(
      service.updateDkiSupervisionScope(
        'target-profile',
        {
          areaScopeIds: ['jaksel'],
          reason: 'Ubah pembagian supervisi DKI',
        },
        actor,
      ),
    ).resolves.toMatchObject({
      id: 'new-assignment',
    });
    expect(tx.userOperationalAssignment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userProfileId: 'target-profile',
        branch: CommandRouteType.DIRECTORATE,
        areaScopes: {
          create: [
            {
              areaId: 'jaksel',
              isPrimary: true,
              validFrom: expect.any(Date),
            },
          ],
        },
      }),
    });
  });

  it('rejects DKI Jakarta province in changePrimaryAssignment', async () => {
    const { service } = buildService(dkiProvince);

    await expect(
      service.changePrimaryAssignment('target-profile', input('dki'), actor),
    ).rejects.toMatchObject({
      code: 'DKI_DIRECTORATE_PROVINCE_SCOPE_INVALID',
    });
  });

  it('accepts DKI Jakarta city/regency as dynamic Directorate/Ditwil assignment scope', async () => {
    const { service, tx } = buildService({
      id: 'jaksel',
      code: '31.74',
      officialCode: '31.74',
      name: 'Kota Administrasi Jakarta Selatan',
      level: AdministrativeLevel.CITY,
      ancestorLinks: [{ ancestor: dkiProvince }],
    });

    await service.changePrimaryAssignment(
      'target-profile',
      input('jaksel'),
      actor,
    );

    expect(tx.userOperationalAssignment.create).toHaveBeenCalledWith({
      data: {
        userProfileId: 'target-profile',
        roleId: 'role-regional_commander',
        branch: CommandRouteType.DIRECTORATE,
        validFrom: new Date('2026-08-09T00:00:00.000Z'),
        isPrimary: true,
        areaScopes: {
          create: [
            {
              areaId: 'jaksel',
              isPrimary: true,
              validFrom: new Date('2026-08-09T00:00:00.000Z'),
            },
          ],
        },
      },
    });
  });

  it('allows one Directorate/Ditwil user to supervise multiple DKI city/regency scopes', async () => {
    const jakartaSelatan = {
      id: 'jaksel',
      code: '31.74',
      officialCode: '31.74',
      name: 'Kota Administrasi Jakarta Selatan',
      level: AdministrativeLevel.CITY,
      ancestorLinks: [{ ancestor: dkiProvince }],
    };
    const jakartaPusat = {
      id: 'jakpus',
      code: '31.71',
      officialCode: '31.71',
      name: 'Kota Administrasi Jakarta Pusat',
      level: AdministrativeLevel.CITY,
      ancestorLinks: [{ ancestor: dkiProvince }],
    };
    const { service, tx } = buildService([jakartaSelatan, jakartaPusat]);

    await service.changePrimaryAssignment(
      'target-profile',
      {
        ...input('jaksel'),
        areaScopeIds: ['jaksel', 'jakpus'],
      },
      actor,
    );

    expect(tx.userOperationalAssignment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userProfileId: 'target-profile',
        branch: CommandRouteType.DIRECTORATE,
        areaScopes: {
          create: [
            {
              areaId: 'jaksel',
              isPrimary: true,
              validFrom: new Date('2026-08-09T00:00:00.000Z'),
            },
            {
              areaId: 'jakpus',
              isPrimary: false,
              validFrom: new Date('2026-08-09T00:00:00.000Z'),
            },
          ],
        },
      }),
    });
  });

  it('keeps non-DKI Directorate/Ditwil supervision at province level', async () => {
    const { service } = buildService(jawaBaratProvince);

    await expect(
      service.changePrimaryAssignment('target-profile', input('jabar'), actor),
    ).resolves.toMatchObject({
      id: 'new-assignment',
    });
  });

  it('applies the same DKI city/regency rule to OIM Directorate/Ditwil assignments', async () => {
    const { service } = buildService(
      {
        id: 'jakpus',
        code: '31.71',
        officialCode: '31.71',
        name: 'Kota Administrasi Jakarta Pusat',
        level: AdministrativeLevel.CITY,
        ancestorLinks: [{ ancestor: dkiProvince }],
      },
      RoleCode.REGIONAL_COMMANDER,
    );

    await expect(
      service.changePrimaryAssignment(
        'target-profile',
        input('jakpus', RoleCode.REGIONAL_COMMANDER),
        actor,
      ),
    ).resolves.toMatchObject({
      id: 'new-assignment',
    });
  });

  it('rejects non-DKI city/regency assignment for Directorate/Ditwil', async () => {
    const { service } = buildService({
      id: 'bandung',
      code: '32.73',
      officialCode: '32.73',
      name: 'Kota Bandung',
      level: AdministrativeLevel.CITY,
      ancestorLinks: [{ ancestor: jawaBaratProvince }],
    });

    await expect(
      service.changePrimaryAssignment(
        'target-profile',
        input('bandung'),
        actor,
      ),
    ).rejects.toMatchObject({
      code: 'DIRECTORATE_SUPERVISION_SCOPE_INVALID',
    });
  });
});
