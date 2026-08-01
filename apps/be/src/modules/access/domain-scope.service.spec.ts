import { OrganizationType, PositionCode } from '../../common/constants/legacy-operational-code.js';
import {
  jest } from '@jest/globals';
import {
  AdministrativeLevel,
  CommandRouteType,
  RoleCode,
  UserProfileStatus,
} from '../../generated/prisma/client.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { DomainScopeService } from './domain-scope.service.js';

describe('DomainScopeService', () => {
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
      authRole: 'operational_intelligence_manager',
      userProfileId: 'profile',
      userProfileStatus: UserProfileStatus.ACTIVE,
      primaryAssignmentId: 'oim-a',
      positionId: 'oim',
      positionCode: RoleCode.OPERATIONAL_INTELLIGENCE_MANAGER,
      positionTitle: 'Kasubdit',
      roleCode: RoleCode.OPERATIONAL_INTELLIGENCE_MANAGER,
      organizationUnitId: 'subdit',
      organizationUnitName: 'Subdit',
      organizationUnitType: OrganizationType.SUBDIRECTORATE,
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
      expect.arrayContaining(['oim', 'fc', 'fo']),
    );
    expect(result.positionIds).not.toContain('foreign');
    expect(result.areaRootIds).toEqual(['province']);
  });

  it('scopes Baket by reporting line without hiding reports from outside the assignment area', async () => {
    const prisma = {
      position: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: 'fo', reportsToPositionId: 'oim' },
          ] as never),
      },
      administrativeAreaClosure: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ descendantId: 'regency' }] as never),
      },
      userOperationalAssignment: {
        findMany: jest.fn().mockResolvedValue([{ id: 'fo-a' }] as never),
      },
    };
    const service = new DomainScopeService(prisma as never);
    const context = {
      positionId: 'oim',
      organizationUnitId: 'bagops',
      commandRouteType: CommandRouteType.BINDA,
      areaScopes: [{ areaId: 'province' }],
    } as unknown as AuthorizationContext;

    await expect(service.baketWhere(context)).resolves.toEqual({
      createdByFieldOfficerAssignmentId: { in: ['fo-a'] },
    });
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
});
