import { jest } from '@jest/globals';
import {
  AdministrativeLevel,
  CommandRouteType,
  RoleCode,
  UserProfileStatus,
} from '../../generated/prisma/client.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { DomainScopeService } from './domain-scope.service.js';

describe('DomainScopeService', () => {
  it('membangun tree wilayah dari descendant scope dan membawa officialCode untuk filter dashboard', async () => {
    const userOperationalAssignmentFindMany = jest
      .fn()
      .mockResolvedValue([] as never);
    const administrativeAreaFindMany = jest.fn().mockResolvedValue([
      {
        id: 'dki',
        parentId: 'indonesia',
        code: '31',
        officialCode: '31',
        name: 'Daerah Khusus Ibukota Jakarta',
        level: AdministrativeLevel.PROVINCE,
      },
      {
        id: 'jakarta-selatan',
        parentId: 'dki',
        code: '31.74',
        officialCode: '31.74',
        name: 'Kota Administrasi Jakarta Selatan',
        level: AdministrativeLevel.CITY,
      },
    ] as never);
    const cache = {
      getOrSet: jest.fn((_key, loader: () => Promise<unknown>) => loader()),
    };
    const service = new DomainScopeService(
      {
        userOperationalAssignment: {
          findMany: userOperationalAssignmentFindMany,
        },
        administrativeArea: {
          findMany: administrativeAreaFindMany,
        },
      } as never,
      cache as never,
    );
    const context: AuthorizationContext = {
      authUserId: 'auth',
      authRole: 'executive',
      userProfileId: 'profile',
      userProfileStatus: UserProfileStatus.ACTIVE,
      primaryAssignmentId: 'executive-a',
      operationalAssignmentId: 'executive-a',
      positionId: 'executive',
      positionCode: RoleCode.EXECUTIVE,
      positionTitle: 'Deputi II',
      roleCode: RoleCode.EXECUTIVE,
      organizationUnitId: 'pusat',
      organizationUnitName: 'PUSAT Indonesia',
      organizationUnitType: CommandRouteType.PUSAT,
      commandRouteType: CommandRouteType.PUSAT,
      areaScopes: [
        {
          areaId: 'indonesia',
          code: 'ID',
          name: 'Indonesia',
          level: AdministrativeLevel.COUNTRY,
          isPrimary: true,
        },
      ],
    };

    const tree = await service.areaTree(context);

    expect(administrativeAreaFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { id: { in: ['indonesia'] } },
            {
              descendantLinks: {
                some: { ancestorId: { in: ['indonesia'] } },
              },
            },
          ]),
        }),
      }),
    );
    expect(tree.children).toEqual([
      expect.objectContaining({
        id: 'dki',
        officialCode: '31',
        children: [
          expect.objectContaining({
            id: 'jakarta-selatan',
            officialCode: '31.74',
          }),
        ],
      }),
    ]);
  });

  it('resolves reporting-line descendants and keeps administrative scope roots compact', async () => {
    const prisma = {
      position: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'oim', reportsToPositionId: 'director' },
          { id: 'fc', reportsToPositionId: 'oim' },
          { id: 'fo', reportsToPositionId: 'fc' },
          { id: 'foreign', reportsToPositionId: 'other-oim' },
        ] as never),
      },
      administrativeAreaClosure: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { descendantId: 'province' },
            { descendantId: 'regency' },
            { descendantId: 'district' },
          ] as never),
      },
      userOperationalAssignment: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: 'oim-a' },
            { id: 'fc-a' },
            { id: 'fo-a' },
          ] as never),
      },
    };
    const service = new DomainScopeService(prisma as never);
    const context: AuthorizationContext = {
      authUserId: 'auth',
      authRole: 'regional_commander',
      userProfileId: 'profile',
      userProfileStatus: UserProfileStatus.ACTIVE,
      primaryAssignmentId: 'oim-a',
      positionId: 'oim',
      positionCode: RoleCode.REGIONAL_COMMANDER,
      positionTitle: 'Kasubdit',
      roleCode: RoleCode.REGIONAL_COMMANDER,
      organizationUnitId: 'subdit',
      organizationUnitName: 'Subdit',
      organizationUnitType: CommandRouteType.DIRECTORATE,
      commandRouteType: CommandRouteType.DIRECTORATE,
      areaScopes: [
        {
          areaId: 'province',
          code: '32',
          name: 'Jawa Barat',
          level: AdministrativeLevel.PROVINCE,
          isPrimary: true,
        },
      ],
    };

    const result = await service.resolve(context);

    expect(result.positionIds).toEqual(
      expect.arrayContaining(['oim-a', 'fc-a', 'fo-a']),
    );
    expect(result.positionIds).not.toContain('foreign');
    expect(result.areaRootIds).toEqual(['province']);
  });

  it('exposes only regionally approved descendant products to Executive', async () => {
    const prisma = {
      position: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'regional', reportsToPositionId: 'executive' },
          { id: 'oim', reportsToPositionId: 'regional' },
        ] as never),
      },
      administrativeAreaClosure: {
        findMany: jest.fn().mockResolvedValue([] as never),
      },
      userOperationalAssignment: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'regional-a' }, { id: 'oim-a' }] as never),
      },
    };
    const service = new DomainScopeService(prisma as never);
    const context = {
      authRole: 'executive',
      positionId: 'executive',
      organizationUnitId: 'national',
      areaScopes: [],
    } as unknown as AuthorizationContext;

    await expect(service.productWhere(context)).resolves.toEqual({
      createdByAssignmentId: { in: ['regional-a', 'oim-a'] },
      status: {
        in: [
          'APPROVED_REGIONAL',
          'UNDER_EXECUTIVE_REVIEW',
          'APPROVED_EXECUTIVE',
          'DISTRIBUTED',
        ],
      },
    });
  });

  it('menandai scope Direktorat/Ditwil DKI sebagai supervisi kota/kabupaten', () => {
    const service = new DomainScopeService({} as never);
    const context: AuthorizationContext = {
      authUserId: 'auth',
      authRole: 'regional_commander',
      userProfileId: 'profile',
      userProfileStatus: UserProfileStatus.ACTIVE,
      primaryAssignmentId: 'directorate-a',
      operationalAssignmentId: 'directorate-a',
      positionId: 'directorate-a',
      positionCode: RoleCode.REGIONAL_COMMANDER,
      positionTitle: 'Direktur 21',
      roleCode: RoleCode.REGIONAL_COMMANDER,
      organizationUnitId: 'ditwil-21',
      organizationUnitName: 'Direktorat 21',
      organizationUnitType: CommandRouteType.DIRECTORATE,
      commandRouteType: CommandRouteType.DIRECTORATE,
      areaScopes: [
        {
          areaId: 'jakarta-selatan',
          code: '31.74',
          name: 'Kota Administrasi Jakarta Selatan',
          level: AdministrativeLevel.CITY,
          isPrimary: true,
        },
      ],
    };

    expect(service.scopeSummary(context)).toMatchObject({
      supervisionMode: 'DKI_REGENCY_CITY',
      supervisionLabel: 'Supervisi DKI berbasis Kota/Kabupaten',
      label: 'Kota Administrasi Jakarta Selatan',
      areas: [
        expect.objectContaining({
          id: 'jakarta-selatan',
          isDkiJakarta: true,
        }),
      ],
    });
  });
});
