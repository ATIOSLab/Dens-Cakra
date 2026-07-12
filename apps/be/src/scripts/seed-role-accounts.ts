import { auth } from '../lib/auth.js';
import { env } from '../lib/env.js';
import {
  SYSTEM_ROLE_CATALOG,
  SYSTEM_ROLES,
  type SystemRole,
} from '../common/constants/system-role.js';
import {
  AdministrativeLevel,
  OrganizationType,
  PositionCode,
  RoleCode,
  UserProfileStatus,
} from '../generated/prisma/client.js';
import { prisma } from '../modules/prisma/prisma.service.js';
import { ensureUserProfileForAuthUser } from '../lib/user-profile.js';

type SeedAccount = {
  email: string;
  name: string;
  password: string;
  role: SystemRole;
};

type OrganizationSeed = {
  code: string;
  name: string;
  type: OrganizationType;
  parentCode?: string;
};

type PositionSeed = {
  key: string;
  seatCode: string;
  code: PositionCode;
  title: string;
  roleCode: RoleCode;
  organizationUnitCode: string;
  reportsToKey?: string;
};

type AssignmentSeed = {
  email: string;
  positionKey: string;
  areaCodes: readonly string[];
};

type ProvinceArea = {
  id: string;
  officialCode: string;
  name: string;
};

type RegencyCityArea = {
  id: string;
  officialCode: string;
  name: string;
  level: 'REGENCY' | 'CITY';
  parentId: string;
};

type DirectorateRegionSeed = {
  key: string;
  name: string;
  provinceCodes: readonly string[];
};

type SeedPlan = {
  accounts: SeedAccount[];
  organizations: OrganizationSeed[];
  positions: PositionSeed[];
  assignments: AssignmentSeed[];
};

const defaultDemoPassword = 'DensCakraDemo123!';
const seedEffectiveFrom = new Date('2026-01-01T00:00:00.000Z');

const DIRECTORATE_REGION_SEEDS: readonly DirectorateRegionSeed[] = [
  {
    key: 'SUMW',
    name: 'Direktorat Wilayah Sumatera Barat Utara',
    provinceCodes: ['11', '12', '13', '14', '15'],
  },
  {
    key: 'SUMS',
    name: 'Direktorat Wilayah Sumatera Selatan Timur',
    provinceCodes: ['16', '17', '18', '19', '21'],
  },
  {
    key: 'JABA',
    name: 'Direktorat Wilayah Jawa Bali',
    provinceCodes: ['31', '32', '33', '34', '35', '36', '51'],
  },
  {
    key: 'NUST',
    name: 'Direktorat Wilayah Nusa Tenggara',
    provinceCodes: ['52', '53'],
  },
  {
    key: 'KALI',
    name: 'Direktorat Wilayah Kalimantan',
    provinceCodes: ['61', '62', '63', '64', '65'],
  },
  {
    key: 'SULA',
    name: 'Direktorat Wilayah Sulawesi',
    provinceCodes: ['71', '72', '73', '74', '75', '76'],
  },
  {
    key: 'MALU',
    name: 'Direktorat Wilayah Maluku',
    provinceCodes: ['81', '82'],
  },
  {
    key: 'PAPU',
    name: 'Direktorat Wilayah Papua',
    provinceCodes: ['91', '92', '93', '94', '95', '96'],
  },
] as const;

const baseAccounts: readonly SeedAccount[] = [
  {
    email: env.bootstrapAdmin.email,
    name: env.bootstrapAdmin.name,
    password: env.bootstrapAdmin.password,
    role: SYSTEM_ROLES.ADMIN_SYSTEM,
  },
  {
    email: 'executive@denscakra.local',
    name: 'Deputi II Demo',
    password: defaultDemoPassword,
    role: SYSTEM_ROLES.EXECUTIVE,
  },
] as const;

const baseOrganizations: readonly OrganizationSeed[] = [
  {
    code: 'ORG-ADMIN-SYSTEM',
    name: 'Admin System',
    type: OrganizationType.OTHER,
  },
  {
    code: 'ORG-DEPUTI-II',
    name: 'Deputi II',
    type: OrganizationType.DEPUTI,
  },
] as const;

const basePositions: readonly PositionSeed[] = [
  {
    key: 'admin',
    seatCode: 'SEED-ADMIN',
    code: PositionCode.ADMIN,
    title: 'Admin Sistem',
    roleCode: RoleCode.ADMIN_SYSTEM,
    organizationUnitCode: 'ORG-ADMIN-SYSTEM',
  },
  {
    key: 'executive',
    seatCode: 'SEED-EXECUTIVE',
    code: PositionCode.DEPUTI_II,
    title: 'Deputi II',
    roleCode: RoleCode.EXECUTIVE,
    organizationUnitCode: 'ORG-DEPUTI-II',
  },
] as const;

const baseAssignments: readonly AssignmentSeed[] = [
  {
    email: env.bootstrapAdmin.email,
    positionKey: 'admin',
    areaCodes: ['IDN'],
  },
  {
    email: 'executive@denscakra.local',
    positionKey: 'executive',
    areaCodes: ['IDN'],
  },
] as const;

function compactAreaCode(code: string) {
  return code.replace(/\./g, '');
}

function uniqueByKey<T>(items: readonly T[], keyOf: (item: T) => string) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = keyOf(item);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

async function ensureUser(account: SeedAccount): Promise<void> {
  const existing = await prisma.user.findUnique({
    where: {
      email: account.email,
    },
  });

  if (!existing) {
    await auth.api.signUpEmail({
      body: {
        email: account.email,
        password: account.password,
        name: account.name,
      },
    });
  }

  await prisma.user.update({
    where: {
      email: account.email,
    },
    data: {
      name: account.name,
      emailVerified: true,
      role: account.role,
      banned: false,
      banReason: null,
      banExpires: null,
    },
  });

  const syncedUser = await prisma.user.findUniqueOrThrow({
    where: {
      email: account.email,
    },
    select: {
      id: true,
      name: true,
    },
  });

  await ensureUserProfileForAuthUser({
    authUserId: syncedUser.id,
    fullName: syncedUser.name,
    status: UserProfileStatus.ACTIVE,
  });
}

async function loadAreaTopology() {
  const provinces = await prisma.administrativeArea.findMany({
    where: {
      level: AdministrativeLevel.PROVINCE,
      isActive: true,
      deletedAt: null,
      officialCode: {
        not: null,
      },
    },
    orderBy: [{ officialCode: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      officialCode: true,
      name: true,
    },
  });

  const normalizedProvinces: ProvinceArea[] = provinces.flatMap((province) =>
    province.officialCode
      ? [
          {
            id: province.id,
            officialCode: province.officialCode,
            name: province.name,
          },
        ]
      : [],
  );

  const regencyCities = await prisma.administrativeArea.findMany({
    where: {
      level: {
        in: [AdministrativeLevel.REGENCY, AdministrativeLevel.CITY],
      },
      parentId: {
        in: normalizedProvinces.map((province) => province.id),
      },
      isActive: true,
      deletedAt: null,
      officialCode: {
        not: null,
      },
    },
    orderBy: [{ parentId: 'asc' }, { officialCode: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      officialCode: true,
      name: true,
      level: true,
      parentId: true,
    },
  });

  const normalizedRegencyCities: RegencyCityArea[] = regencyCities.flatMap(
    (area) =>
      area.officialCode
        ? [
            {
              id: area.id,
              officialCode: area.officialCode,
              name: area.name,
              level:
                area.level === AdministrativeLevel.REGENCY
                  ? AdministrativeLevel.REGENCY
                  : AdministrativeLevel.CITY,
              parentId: area.parentId ?? '',
            },
          ]
        : [],
  );

  if (!normalizedProvinces.length || !normalizedRegencyCities.length) {
    throw new Error(
      'Administrative area baseline is incomplete. Run seed-master and seed-wilayah first.',
    );
  }

  return {
    provinces: normalizedProvinces,
    regencyCities: normalizedRegencyCities,
  };
}

function buildSeedPlan(
  provinces: ProvinceArea[],
  regencyCities: RegencyCityArea[],
): SeedPlan {
  const provinceById = new Map(
    provinces.map((province) => [province.id, province]),
  );
  const provinceByCode = new Map(
    provinces.map((province) => [province.officialCode, province]),
  );
  const regencyCitiesByProvinceId = new Map<string, RegencyCityArea[]>();

  for (const area of regencyCities) {
    const items = regencyCitiesByProvinceId.get(area.parentId) ?? [];
    items.push(area);
    regencyCitiesByProvinceId.set(area.parentId, items);
  }

  const mappedProvinceCodes = new Set(
    DIRECTORATE_REGION_SEEDS.flatMap((region) => region.provinceCodes),
  );

  for (const province of provinces) {
    if (!mappedProvinceCodes.has(province.officialCode)) {
      throw new Error(
        `Province ${province.officialCode} (${province.name}) is not mapped to a directorate region.`,
      );
    }
  }

  const accounts: SeedAccount[] = [...baseAccounts];
  const organizations: OrganizationSeed[] = [...baseOrganizations];
  const positions: PositionSeed[] = [...basePositions];
  const assignments: AssignmentSeed[] = [...baseAssignments];

  for (const region of DIRECTORATE_REGION_SEEDS) {
    const regionDirectorateCode = `DIR-${region.key}`;
    const regionSubdirectorateCode = `SUB-${region.key}`;
    const directorEmail = `dirwil.${region.key.toLowerCase()}@denscakra.local`;
    const kasubditEmail = `kasubdit.${region.key.toLowerCase()}@denscakra.local`;

    organizations.push(
      {
        code: regionDirectorateCode,
        name: region.name,
        type: OrganizationType.DIRECTORATE,
        parentCode: 'ORG-DEPUTI-II',
      },
      {
        code: regionSubdirectorateCode,
        name: `Subdirektorat ${region.name.replace('Direktorat Wilayah ', '')}`,
        type: OrganizationType.SUBDIRECTORATE,
        parentCode: regionDirectorateCode,
      },
    );

    accounts.push(
      {
        email: directorEmail,
        name: `Direktur Wilayah ${region.name.replace('Direktorat Wilayah ', '')}`,
        password: defaultDemoPassword,
        role: SYSTEM_ROLES.REGIONAL_COMMANDER,
      },
      {
        email: kasubditEmail,
        name: `Kasubdit ${region.name.replace('Direktorat Wilayah ', '')}`,
        password: defaultDemoPassword,
        role: SYSTEM_ROLES.OPERATIONAL_INTELLIGENCE_MANAGER,
      },
    );

    positions.push(
      {
        key: `director:${region.key}`,
        seatCode: `DIR-${region.key}`,
        code: PositionCode.DIREKTUR_WILAYAH,
        title: `Direktur Wilayah ${region.name.replace('Direktorat Wilayah ', '')}`,
        roleCode: RoleCode.REGIONAL_COMMANDER,
        organizationUnitCode: regionDirectorateCode,
        reportsToKey: 'executive',
      },
      {
        key: `kasubdit:${region.key}`,
        seatCode: `KAS-${region.key}`,
        code: PositionCode.KASUBDIT,
        title: `Kasubdit ${region.name.replace('Direktorat Wilayah ', '')}`,
        roleCode: RoleCode.OPERATIONAL_INTELLIGENCE_MANAGER,
        organizationUnitCode: regionSubdirectorateCode,
        reportsToKey: `director:${region.key}`,
      },
    );

    assignments.push(
      {
        email: directorEmail,
        positionKey: `director:${region.key}`,
        areaCodes: region.provinceCodes,
      },
      {
        email: kasubditEmail,
        positionKey: `kasubdit:${region.key}`,
        areaCodes: region.provinceCodes,
      },
    );

    for (const provinceCode of region.provinceCodes) {
      const province = provinceByCode.get(provinceCode);

      if (!province) {
        throw new Error(
          `Province ${provinceCode} referenced by region ${region.key} is missing.`,
        );
      }

      const provinceRegencyCities =
        regencyCitiesByProvinceId
          .get(province.id)
          ?.slice()
          .sort((left, right) =>
            left.officialCode.localeCompare(right.officialCode),
          ) ?? [];

      const fcuCode = `FCD-${region.key}-${compactAreaCode(province.officialCode)}`;
      const staffEmail = `staf.subdit.${region.key.toLowerCase()}.${compactAreaCode(province.officialCode)}@denscakra.local`;

      organizations.push({
        code: fcuCode,
        name: `Field Coordination Unit Direktorat ${province.name}`,
        type: OrganizationType.FIELD_COORDINATION_UNIT,
        parentCode: regionSubdirectorateCode,
      });

      accounts.push({
        email: staffEmail,
        name: `Staf Subdit ${province.name}`,
        password: defaultDemoPassword,
        role: SYSTEM_ROLES.FIELD_COORDINATOR,
      });

      positions.push({
        key: `staf-subdit:${province.officialCode}`,
        seatCode: `SSD-${region.key}-${compactAreaCode(province.officialCode)}`,
        code: PositionCode.STAF_SUBDIT,
        title: `Staf Subdit ${province.name}`,
        roleCode: RoleCode.FIELD_COORDINATOR,
        organizationUnitCode: fcuCode,
        reportsToKey: `kasubdit:${region.key}`,
      });

      assignments.push({
        email: staffEmail,
        positionKey: `staf-subdit:${province.officialCode}`,
        areaCodes: provinceRegencyCities.map((area) => area.officialCode),
      });

      for (const area of provinceRegencyCities) {
        const compactCode = compactAreaCode(area.officialCode);
        const agentEmail = `agent.dir.${compactCode}@denscakra.local`;

        accounts.push({
          email: agentEmail,
          name: `Agent Direktorat ${area.name}`,
          password: defaultDemoPassword,
          role: SYSTEM_ROLES.FIELD_OFFICER,
        });

        positions.push({
          key: `agent-directorate:${area.officialCode}`,
          seatCode: `AGD-${compactCode}`,
          code: PositionCode.PETUGAS_ORGANIK,
          title: `Petugas Organik Direktorat ${area.name}`,
          roleCode: RoleCode.FIELD_OFFICER,
          organizationUnitCode: fcuCode,
          reportsToKey: `staf-subdit:${province.officialCode}`,
        });

        assignments.push({
          email: agentEmail,
          positionKey: `agent-directorate:${area.officialCode}`,
          areaCodes: [area.officialCode],
        });
      }
    }
  }

  for (const province of provinces) {
    const provinceRegencyCities =
      regencyCitiesByProvinceId
        .get(province.id)
        ?.slice()
        .sort((left, right) =>
          left.officialCode.localeCompare(right.officialCode),
        ) ?? [];
    const compactProvinceCode = compactAreaCode(province.officialCode);
    const bindaCode = `BND-${compactProvinceCode}`;
    const bagopsCode = `BAG-${compactProvinceCode}`;
    const kabindaEmail = `kabinda.${compactProvinceCode}@denscakra.local`;
    const kabagopsEmail = `kabagops.${compactProvinceCode}@denscakra.local`;

    organizations.push(
      {
        code: bindaCode,
        name: `Binda ${province.name}`,
        type: OrganizationType.BINDA,
        parentCode: 'ORG-DEPUTI-II',
      },
      {
        code: bagopsCode,
        name: `Bagops Binda ${province.name}`,
        type: OrganizationType.BAGOPS,
        parentCode: bindaCode,
      },
    );

    accounts.push(
      {
        email: kabindaEmail,
        name: `Kabinda ${province.name}`,
        password: defaultDemoPassword,
        role: SYSTEM_ROLES.REGIONAL_COMMANDER,
      },
      {
        email: kabagopsEmail,
        name: `Kabagops ${province.name}`,
        password: defaultDemoPassword,
        role: SYSTEM_ROLES.OPERATIONAL_INTELLIGENCE_MANAGER,
      },
    );

    positions.push(
      {
        key: `kabinda:${province.officialCode}`,
        seatCode: `KBD-${compactProvinceCode}`,
        code: PositionCode.KABINDA,
        title: `Kabinda ${province.name}`,
        roleCode: RoleCode.REGIONAL_COMMANDER,
        organizationUnitCode: bindaCode,
        reportsToKey: 'executive',
      },
      {
        key: `kabagops:${province.officialCode}`,
        seatCode: `KBG-${compactProvinceCode}`,
        code: PositionCode.KABAGOPS,
        title: `Kabagops ${province.name}`,
        roleCode: RoleCode.OPERATIONAL_INTELLIGENCE_MANAGER,
        organizationUnitCode: bagopsCode,
        reportsToKey: `kabinda:${province.officialCode}`,
      },
    );

    assignments.push(
      {
        email: kabindaEmail,
        positionKey: `kabinda:${province.officialCode}`,
        areaCodes: [province.officialCode],
      },
      {
        email: kabagopsEmail,
        positionKey: `kabagops:${province.officialCode}`,
        areaCodes: [province.officialCode],
      },
    );

    for (const area of provinceRegencyCities) {
      const compactCode = compactAreaCode(area.officialCode);
      const fcuCode = `FCB-${compactCode}`;
      const korwilEmail = `korwil.binda.${compactCode}@denscakra.local`;
      const agentEmail = `agent.binda.${compactCode}@denscakra.local`;

      organizations.push({
        code: fcuCode,
        name: `Field Coordination Unit Binda ${area.name}`,
        type: OrganizationType.FIELD_COORDINATION_UNIT,
        parentCode: bagopsCode,
      });

      accounts.push(
        {
          email: korwilEmail,
          name: `Korwil ${area.name}`,
          password: defaultDemoPassword,
          role: SYSTEM_ROLES.FIELD_COORDINATOR,
        },
        {
          email: agentEmail,
          name: `Agent Binda ${area.name}`,
          password: defaultDemoPassword,
          role: SYSTEM_ROLES.FIELD_OFFICER,
        },
      );

      positions.push(
        {
          key: `korwil-binda:${area.officialCode}`,
          seatCode: `KWB-${compactCode}`,
          code: PositionCode.KORWIL,
          title: `Korwil ${area.name}`,
          roleCode: RoleCode.FIELD_COORDINATOR,
          organizationUnitCode: fcuCode,
          reportsToKey: `kabagops:${province.officialCode}`,
        },
        {
          key: `agent-binda:${area.officialCode}`,
          seatCode: `AGB-${compactCode}`,
          code: PositionCode.PETUGAS_ORGANIK,
          title: `Petugas Organik Binda ${area.name}`,
          roleCode: RoleCode.FIELD_OFFICER,
          organizationUnitCode: fcuCode,
          reportsToKey: `korwil-binda:${area.officialCode}`,
        },
      );

      assignments.push(
        {
          email: korwilEmail,
          positionKey: `korwil-binda:${area.officialCode}`,
          areaCodes: [area.officialCode],
        },
        {
          email: agentEmail,
          positionKey: `agent-binda:${area.officialCode}`,
          areaCodes: [area.officialCode],
        },
      );
    }
  }

  return {
    accounts: uniqueByKey(accounts, (item) => item.email),
    organizations: uniqueByKey(organizations, (item) => item.code),
    positions: uniqueByKey(positions, (item) => item.seatCode),
    assignments: uniqueByKey(
      assignments,
      (item) => `${item.email}:${item.positionKey}:${item.areaCodes.join(',')}`,
    ),
  };
}

async function ensureOrganizationBaseline(plan: SeedPlan) {
  const tx = prisma;

  for (const seed of plan.organizations) {
    const parentId = seed.parentCode
      ? (
          await tx.organizationUnit.findUniqueOrThrow({
            where: {
              code: seed.parentCode,
            },
            select: {
              id: true,
            },
          })
        ).id
      : null;

    await tx.organizationUnit.upsert({
      where: {
        code: seed.code,
      },
      update: {
        name: seed.name,
        type: seed.type,
        parentId,
        isActive: true,
        deletedAt: null,
      },
      create: {
        code: seed.code,
        name: seed.name,
        type: seed.type,
        parentId,
        isActive: true,
      },
    });
  }

  const units = await tx.organizationUnit.findMany({
    where: {
      code: {
        in: plan.organizations.map((seed) => seed.code),
      },
    },
    select: {
      id: true,
      code: true,
      parentId: true,
    },
  });

  const unitByCode = new Map(units.map((unit) => [unit.code, unit]));
  const unitById = new Map(units.map((unit) => [unit.id, unit]));

  await tx.organizationUnitClosure.deleteMany({
    where: {
      descendantId: {
        in: units.map((unit) => unit.id),
      },
    },
  });

  for (const unit of units) {
    let cursorId: string | null = unit.id;
    let depth = 0;

    while (cursorId) {
      const cursor = unitById.get(cursorId);

      if (!cursor) {
        break;
      }

      await tx.organizationUnitClosure.create({
        data: {
          ancestorId: cursor.id,
          descendantId: unit.id,
          depth,
        },
      });

      cursorId = cursor.parentId;
      depth += 1;
    }
  }

  const roles = await tx.role.findMany({
    where: {
      code: {
        in: [
          RoleCode.ADMIN_SYSTEM,
          RoleCode.EXECUTIVE,
          RoleCode.REGIONAL_COMMANDER,
          RoleCode.OPERATIONAL_INTELLIGENCE_MANAGER,
          RoleCode.FIELD_COORDINATOR,
          RoleCode.FIELD_OFFICER,
        ],
      },
    },
    select: {
      id: true,
      code: true,
    },
  });

  const roleIdByCode = new Map(roles.map((role) => [role.code, role.id]));
  const positionByKey = new Map<string, { id: string; code: PositionCode }>();

  for (const seed of plan.positions) {
    const organizationUnit = unitByCode.get(seed.organizationUnitCode);
    const roleId = roleIdByCode.get(seed.roleCode);

    if (!organizationUnit || !roleId) {
      throw new Error(`Missing baseline dependency for position ${seed.key}.`);
    }

    const reportsToPositionId = seed.reportsToKey
      ? (positionByKey.get(seed.reportsToKey)?.id ?? null)
      : null;

    const existingPosition = await tx.position.findUnique({
      where: {
        seatCode: seed.seatCode,
      },
      select: {
        id: true,
      },
    });

    const position = existingPosition
      ? await tx.position.update({
          where: {
            id: existingPosition.id,
          },
          data: {
            code: seed.code,
            title: seed.title,
            roleId,
            organizationUnitId: organizationUnit.id,
            reportsToPositionId,
            isActive: true,
          },
          select: {
            id: true,
            code: true,
          },
        })
      : await tx.position.create({
          data: {
            seatCode: seed.seatCode,
            code: seed.code,
            title: seed.title,
            roleId,
            organizationUnitId: organizationUnit.id,
            reportsToPositionId,
            isActive: true,
          },
          select: {
            id: true,
            code: true,
          },
        });

    positionByKey.set(seed.key, position);
  }

  const profiles = await tx.userProfile.findMany({
    where: {
      authUser: {
        email: {
          in: plan.assignments.map((seed) => seed.email),
        },
      },
    },
    select: {
      id: true,
      authUser: {
        select: {
          email: true,
        },
      },
    },
  });

  const profileByEmail = new Map(
    profiles.map((profile) => [profile.authUser.email, profile]),
  );

  const areas = await tx.administrativeArea.findMany({
    where: {
      officialCode: {
        in: Array.from(
          new Set(plan.assignments.flatMap((seed) => seed.areaCodes)),
        ),
      },
    },
    select: {
      id: true,
      officialCode: true,
    },
  });

  const areaByCode = new Map(
    areas.map((area) => [area.officialCode ?? "", area]),
  );

  for (const seed of plan.assignments) {
    const profile = profileByEmail.get(seed.email);
    const position = positionByKey.get(seed.positionKey);

    if (!profile || !position) {
      throw new Error(`Missing profile or position for ${seed.email}.`);
    }

    await tx.userProfile.update({
      where: {
        id: profile.id,
      },
      data: {
        status: UserProfileStatus.ACTIVE,
        isActive: true,
        deletedAt: null,
      },
    });

    await tx.positionAssignment.updateMany({
      where: {
        positionId: position.id,
        isActive: true,
        validUntil: null,
        NOT: {
          userProfileId: profile.id,
        },
      },
      data: {
        isActive: false,
        isPrimary: false,
        validUntil: seedEffectiveFrom,
      },
    });

    let assignment = await tx.positionAssignment.findFirst({
      where: {
        userProfileId: profile.id,
        positionId: position.id,
        isPrimary: true,
        validUntil: null,
      },
      select: {
        id: true,
      },
    });

    if (!assignment) {
      await tx.positionAssignment.updateMany({
        where: {
          userProfileId: profile.id,
          isPrimary: true,
          isActive: true,
          validUntil: null,
        },
        data: {
          isActive: false,
          isPrimary: false,
          validUntil: seedEffectiveFrom,
        },
      });

      assignment = await tx.positionAssignment.create({
        data: {
          userProfileId: profile.id,
          positionId: position.id,
          isPrimary: true,
          isActive: true,
          validFrom: seedEffectiveFrom,
        },
        select: {
          id: true,
        },
      });
    } else {
      await tx.positionAssignment.update({
        where: {
          id: assignment.id,
        },
        data: {
          isActive: true,
          isPrimary: true,
          validUntil: null,
        },
      });
    }

    const areaIds = seed.areaCodes.map((areaCode) => {
      const area = areaByCode.get(areaCode);

      if (!area) {
        throw new Error(`Administrative area ${areaCode} is missing.`);
      }

      return area.id;
    });

    await tx.positionAreaScope.updateMany({
      where: {
        positionAssignmentId: assignment.id,
        validUntil: null,
        areaId: {
          notIn: areaIds,
        },
      },
      data: {
        validUntil: seedEffectiveFrom,
      },
    });

    for (const [index, areaId] of areaIds.entries()) {
      const activeScope = await tx.positionAreaScope.findFirst({
        where: {
          positionAssignmentId: assignment.id,
          areaId,
          validUntil: null,
        },
        select: {
          id: true,
        },
      });

      if (activeScope) {
        await tx.positionAreaScope.update({
          where: {
            id: activeScope.id,
          },
          data: {
            isPrimary: index === 0,
          },
        });
        continue;
      }

      await tx.positionAreaScope.create({
        data: {
          positionAssignmentId: assignment.id,
          areaId,
          isPrimary: index === 0,
          validFrom: seedEffectiveFrom,
        },
      });
    }
  }
}

async function logSeedSummary(plan: SeedPlan) {
  const roleCounts = new Map<SystemRole, number>();

  for (const account of plan.accounts) {
    roleCounts.set(account.role, (roleCounts.get(account.role) ?? 0) + 1);
  }

  console.log('Seeded hierarchical role accounts summary:');
  console.log(
    `- organization units: ${plan.organizations.length}, positions: ${plan.positions.length}, assignments: ${plan.assignments.length}, users: ${plan.accounts.length}`,
  );

  for (const role of SYSTEM_ROLE_CATALOG) {
    console.log(`- ${role.label}: ${roleCounts.get(role.key) ?? 0} akun`);
  }

  const sampleUsers = await prisma.user.findMany({
    where: {
      email: {
        in: [
          'executive@denscakra.local',
          'dirwil.jaba@denscakra.local',
          'kabinda.11@denscakra.local',
          'kasubdit.jaba@denscakra.local',
          'kabagops.11@denscakra.local',
        ],
      },
    },
    orderBy: {
      email: 'asc',
    },
    select: {
      email: true,
      role: true,
      profile: {
        select: {
          positionAssignments: {
            where: {
              isPrimary: true,
              isActive: true,
              validUntil: null,
            },
            take: 1,
            select: {
              position: {
                select: {
                  code: true,
                  title: true,
                  organizationUnit: {
                    select: {
                      code: true,
                    },
                  },
                },
              },
              areaScopes: {
                where: {
                  validUntil: null,
                },
                orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
                select: {
                  area: {
                    select: {
                      officialCode: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  for (const user of sampleUsers) {
    const assignment = user.profile?.positionAssignments[0];
    const areas =
      assignment?.areaScopes
        .map((scope) => scope.area.officialCode)
        .join(', ') ?? 'none';

    console.log(
      `- sample ${user.email}: role=${user.role}, position=${assignment?.position.code ?? 'NONE'}, unit=${assignment?.position.organizationUnit.code ?? 'NONE'}, areas=${areas}`,
    );
  }
}

async function seedRoleAccounts() {
  const { provinces, regencyCities } = await loadAreaTopology();
  const plan = buildSeedPlan(provinces, regencyCities);

  for (const account of plan.accounts) {
    await ensureUser(account);
  }

  await ensureOrganizationBaseline(plan);
  await logSeedSummary(plan);
}

void seedRoleAccounts()
  .catch((error: unknown) => {
    console.error('Failed to seed role accounts.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
