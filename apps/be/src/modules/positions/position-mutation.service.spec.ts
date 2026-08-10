import { jest } from '@jest/globals';
import {
  AdministrativeLevel,
  CommandRouteType,
  RoleCode,
} from '../../generated/prisma/client.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { PositionMutationService } from './position-mutation.service.js';

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

function buildService(area: unknown, roleCode = RoleCode.REGIONAL_COMMANDER) {
  const tx = {
    userAreaScope: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 } as never),
      createMany: jest.fn().mockResolvedValue({ count: 1 } as never),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: 'audit' } as never),
    },
  };
  const prisma = {
    userOperationalAssignment: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        id: 'assignment',
        branch: CommandRouteType.DIRECTORATE,
        role: { code: roleCode },
      } as never),
    },
    roleAreaPolicy: {
      findMany: jest.fn().mockResolvedValue([] as never),
    },
    administrativeArea: {
      findMany: jest.fn().mockResolvedValue([area] as never),
    },
    $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };

  return {
    service: new PositionMutationService(
      prisma as never,
      {} as never,
      {} as never,
    ),
    prisma,
    tx,
  };
}

describe('PositionMutationService DKI supervision scope', () => {
  it('rejects DKI Jakarta province as a Directorate/Ditwil supervision scope', async () => {
    const { service } = buildService(dkiProvince);

    await expect(service.validateScopes('assignment', ['dki'])).resolves.toEqual(
      {
        valid: false,
        violations: ['DKI_DIRECTORATE_PROVINCE_SCOPE_INVALID'],
        warnings: [],
      },
    );
  });

  it('accepts DKI Jakarta city/regency descendants as dynamic supervision scope', async () => {
    const { service } = buildService({
      id: 'jaksel',
      code: '31.74',
      officialCode: '31.74',
      name: 'Kota Administrasi Jakarta Selatan',
      level: AdministrativeLevel.CITY,
      ancestorLinks: [{ ancestor: dkiProvince }],
    });

    await expect(
      service.validateScopes('assignment', ['jaksel']),
    ).resolves.toEqual({
      valid: true,
      violations: [],
      warnings: [],
    });
  });

  it('keeps non-DKI Directorate/Ditwil supervision at province level', async () => {
    const { service } = buildService(jawaBaratProvince);

    await expect(
      service.validateScopes('assignment', ['jabar']),
    ).resolves.toEqual({
      valid: true,
      violations: [],
      warnings: [],
    });
  });

  it('applies the same DKI city/regency validation to OIM assignments', async () => {
    const { service } = buildService(
      {
        id: 'jakbar',
        code: '31.73',
        officialCode: '31.73',
        name: 'Kota Administrasi Jakarta Barat',
        level: AdministrativeLevel.CITY,
        ancestorLinks: [{ ancestor: dkiProvince }],
      },
      RoleCode.OPERATIONAL_INTELLIGENCE_MANAGER,
    );

    await expect(
      service.validateScopes('assignment', ['jakbar']),
    ).resolves.toEqual({
      valid: true,
      violations: [],
      warnings: [],
    });
  });

  it('rejects non-DKI city/regency supervision for Directorate/Ditwil', async () => {
    const { service } = buildService({
      id: 'bandung',
      code: '32.73',
      officialCode: '32.73',
      name: 'Kota Bandung',
      level: AdministrativeLevel.CITY,
      ancestorLinks: [{ ancestor: jawaBaratProvince }],
    });

    await expect(
      service.validateScopes('assignment', ['bandung']),
    ).resolves.toEqual({
      valid: false,
      violations: ['DIRECTORATE_SUPERVISION_SCOPE_INVALID'],
      warnings: [],
    });
  });

  it('replaces assignment scope through UserAreaScope so admin mapping remains database-driven', async () => {
    const { service, tx } = buildService({
      id: 'jaksel',
      code: '31.74',
      officialCode: '31.74',
      name: 'Kota Administrasi Jakarta Selatan',
      level: AdministrativeLevel.CITY,
      ancestorLinks: [{ ancestor: dkiProvince }],
    });
    const actor = {
      userProfileId: 'actor-profile',
      primaryAssignmentId: 'actor-assignment',
    } as AuthorizationContext;

    await service.replaceScopes(
      'assignment',
      {
        reason: 'Pemindahan wilayah supervisi DKI',
        effectiveAt: '2026-08-09T00:00:00.000Z',
        areas: [{ areaId: 'jaksel', isPrimary: true }],
      },
      actor,
    );

    expect(tx.userAreaScope.updateMany).toHaveBeenCalledWith({
      where: { operationalAssignmentId: 'assignment', validUntil: null },
      data: { validUntil: new Date('2026-08-09T00:00:00.000Z') },
    });
    expect(tx.userAreaScope.createMany).toHaveBeenCalledWith({
      data: [
        {
          operationalAssignmentId: 'assignment',
          areaId: 'jaksel',
          isPrimary: true,
          validFrom: new Date('2026-08-09T00:00:00.000Z'),
        },
      ],
    });
  });
});
