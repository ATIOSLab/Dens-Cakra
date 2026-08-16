import {
  AdministrativeLevel,
  CommandRouteType,
  RoleCode,
  UserProfileStatus,
} from '../generated/prisma/client.js';
import { DKI_JAKARTA_PROVINCE_CODE } from '../common/administrative/dki-supervision.js';
import { AUTH_ROLE_TO_DOMAIN_ROLE } from '../common/constants/auth-role.js';
import {
  SYSTEM_ROLE_CATALOG,
  SYSTEM_ROLES,
  type SystemRole,
} from '../common/constants/system-role.js';
import { auth } from '../lib/auth.js';
import { env, requireSeedPassword } from '../lib/env.js';
import { ensureUserProfileForAuthUser } from '../lib/user-profile.js';
import { prisma } from '../modules/prisma/prisma.service.js';

type ScopeGroup =
  'COUNTRY' | 'DKI_PROVINCE' | 'DKI_REGENCY_CITIES' | 'AREA_CODES';

type SeedAccount = {
  email: string;
  name: string;
  password: string;
  username?: string;
  systemRole: SystemRole;
  roleCode: RoleCode;
  branch: CommandRouteType;
  scopeGroup: ScopeGroup;
  areaCodes?: readonly string[];
};

type AreaSummary = {
  id: string;
  code: string;
  officialCode: string | null;
  name: string;
  level: AdministrativeLevel;
  parentId: string | null;
};

const defaultDemoPassword = requireSeedPassword(
  'SEED_DEMO_PASSWORD',
  env.seed.demoPassword,
);
const seedEffectiveFrom = new Date('2026-01-01T00:00:00.000Z');

const baselineAccounts: readonly SeedAccount[] = [
  {
    email: env.bootstrapAdmin.email,
    name: env.bootstrapAdmin.name,
    password: requireSeedPassword(
      'BOOTSTRAP_ADMIN_PASSWORD',
      env.bootstrapAdmin.password,
    ),
    systemRole: SYSTEM_ROLES.ADMIN_SYSTEM,
    roleCode: RoleCode.ADMIN_SYSTEM,
    branch: CommandRouteType.PUSAT,
    scopeGroup: 'COUNTRY',
  },
  {
    email: 'deputi@denscakra.local',
    name: 'Deputi II',
    password: defaultDemoPassword,
    username: 'deputi.2.bin',
    systemRole: SYSTEM_ROLES.EXECUTIVE,
    roleCode: RoleCode.EXECUTIVE,
    branch: CommandRouteType.PUSAT,
    scopeGroup: 'COUNTRY',
  },
  {
    email: 'dirwil.jaba@denscakra.local',
    name: 'Direktur Supervisi DKI',
    password: defaultDemoPassword,
    username: 'direktur.supervisi.dki',
    systemRole: SYSTEM_ROLES.REGIONAL_COMMANDER,
    roleCode: RoleCode.REGIONAL_COMMANDER,
    branch: CommandRouteType.DIRECTORATE,
    scopeGroup: 'DKI_REGENCY_CITIES',
  },
  {
    email: 'kabinda.31@denscakra.local',
    name: 'Kepala BIN Daerah (Kabinda) DKI Jakarta',
    password: defaultDemoPassword,
    username: 'kabinda.31',
    systemRole: SYSTEM_ROLES.REGIONAL_COMMANDER,
    roleCode: RoleCode.REGIONAL_COMMANDER,
    branch: CommandRouteType.BINDA,
    scopeGroup: 'DKI_PROVINCE',
  },
] as const;

function compactAreaCode(code: string) {
  return code.replace(/\./g, '').toLowerCase();
}

async function ensureUser(account: SeedAccount) {
  const existing = await prisma.user.findUnique({
    where: { email: account.email },
    select: { id: true },
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

  const user = await prisma.user.update({
    where: { email: account.email },
    data: {
      name: account.name,
      username: account.username ?? undefined,
      displayUsername: account.username ?? undefined,
      emailVerified: true,
      role: account.systemRole,
      banned: false,
      banReason: null,
      banExpires: null,
    },
    select: { id: true, name: true },
  });

  return ensureUserProfileForAuthUser({
    authUserId: user.id,
    fullName: user.name,
    username: account.username ?? undefined,
    status: UserProfileStatus.ACTIVE,
  });
}

async function loadActiveAreas() {
  const areas = await prisma.administrativeArea.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: [{ officialCode: 'asc' }, { code: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      code: true,
      officialCode: true,
      name: true,
      level: true,
      parentId: true,
    },
  });

  const country = areas.find(
    (area) =>
      area.level === AdministrativeLevel.COUNTRY &&
      (area.officialCode === 'IDN' || area.code === 'ID'),
  );
  const dkiProvince = areas.find(
    (area) =>
      area.level === AdministrativeLevel.PROVINCE &&
      (area.officialCode === DKI_JAKARTA_PROVINCE_CODE ||
        area.code === DKI_JAKARTA_PROVINCE_CODE),
  );
  const dkiRegencyCities = dkiProvince
    ? areas.filter(
        (area) =>
          area.parentId === dkiProvince.id &&
          [AdministrativeLevel.REGENCY, AdministrativeLevel.CITY].includes(
            area.level,
          ),
      )
    : [];
  const dkiDistricts = dkiRegencyCities.flatMap((regencyCity) =>
    areas
      .filter(
        (area) =>
          area.parentId === regencyCity.id &&
          area.level === AdministrativeLevel.DISTRICT,
      )
      .map((district) => ({ regencyCity, district })),
  );
  const provinces = areas.filter(
    (area) => area.level === AdministrativeLevel.PROVINCE,
  );
  const regencyCities = areas.filter((area) =>
    [AdministrativeLevel.REGENCY, AdministrativeLevel.CITY].includes(
      area.level,
    ),
  );

  if (!country) {
    throw new Error(
      'Wilayah Indonesia belum tersedia. Jalankan seed-master terlebih dahulu.',
    );
  }
  if (!dkiProvince || !dkiRegencyCities.length) {
    throw new Error(
      'Wilayah DKI Jakarta belum lengkap. Jalankan seed-wilayah terlebih dahulu.',
    );
  }
  if (!provinces.length || !regencyCities.length) {
    throw new Error(
      'Wilayah provinsi dan kabupaten/kota belum lengkap. Jalankan seed-wilayah terlebih dahulu.',
    );
  }

  return {
    areas,
    country,
    dkiProvince,
    dkiRegencyCities,
    dkiDistricts,
    provinces,
    regencyCities,
  };
}

function resolveScopeAreas(
  account: SeedAccount,
  topology: Awaited<ReturnType<typeof loadActiveAreas>>,
) {
  if (account.scopeGroup === 'COUNTRY') return [topology.country];
  if (account.scopeGroup === 'DKI_PROVINCE') return [topology.dkiProvince];
  if (account.scopeGroup === 'DKI_REGENCY_CITIES') {
    return topology.dkiRegencyCities;
  }

  const areaByCode = new Map<string, AreaSummary>();
  for (const area of topology.areas) {
    areaByCode.set(area.code, area);
    if (area.officialCode) areaByCode.set(area.officialCode, area);
  }

  const areas = (account.areaCodes ?? []).map((code) => areaByCode.get(code));
  if (areas.some((area) => !area)) {
    throw new Error(`Cakupan wilayah ${account.email} tidak ditemukan.`);
  }

  return areas as AreaSummary[];
}

async function ensureOperationalAssignment(
  account: SeedAccount,
  profileId: string,
  areas: AreaSummary[],
) {
  if (!areas.length) {
    throw new Error(`Cakupan wilayah ${account.email} tidak boleh kosong.`);
  }

  const role = await prisma.role.findUniqueOrThrow({
    where: { code: account.roleCode },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    let assignment = await tx.userOperationalAssignment.findFirst({
      where: {
        userProfileId: profileId,
        roleId: role.id,
        branch: account.branch,
        isPrimary: true,
        validUntil: null,
      },
      select: { id: true },
    });

    if (!assignment) {
      await tx.userOperationalAssignment.updateMany({
        where: {
          userProfileId: profileId,
          isPrimary: true,
          isActive: true,
          validUntil: null,
        },
        data: {
          isPrimary: false,
          isActive: false,
          validUntil: seedEffectiveFrom,
        },
      });

      assignment = await tx.userOperationalAssignment.create({
        data: {
          userProfileId: profileId,
          roleId: role.id,
          branch: account.branch,
          isPrimary: true,
          isActive: true,
          validFrom: seedEffectiveFrom,
          areaScopes: {
            create: areas.map((area, index) => ({
              areaId: area.id,
              isPrimary: index === 0,
              validFrom: seedEffectiveFrom,
            })),
          },
        },
        select: { id: true },
      });
      return;
    }

    await tx.userOperationalAssignment.updateMany({
      where: {
        userProfileId: profileId,
        id: { not: assignment.id },
        isPrimary: true,
        isActive: true,
        validUntil: null,
      },
      data: {
        isPrimary: false,
        isActive: false,
        validUntil: seedEffectiveFrom,
      },
    });
    await tx.userOperationalAssignment.update({
      where: { id: assignment.id },
      data: { isPrimary: true, isActive: true, validUntil: null },
    });

    const areaIds = areas.map((area) => area.id);
    await tx.userAreaScope.updateMany({
      where: {
        operationalAssignmentId: assignment.id,
        validUntil: null,
        areaId: { notIn: areaIds },
      },
      data: { validUntil: seedEffectiveFrom },
    });

    for (const [index, area] of areas.entries()) {
      const activeScope = await tx.userAreaScope.findFirst({
        where: {
          operationalAssignmentId: assignment.id,
          areaId: area.id,
          validUntil: null,
        },
        select: { id: true },
      });

      if (activeScope) {
        await tx.userAreaScope.update({
          where: { id: activeScope.id },
          data: { isPrimary: index === 0 },
        });
        continue;
      }

      await tx.userAreaScope.create({
        data: {
          operationalAssignmentId: assignment.id,
          areaId: area.id,
          isPrimary: index === 0,
          validFrom: seedEffectiveFrom,
        },
      });
    }
  });
}

async function syncRoleLabels() {
  const roleLabels = new Map<RoleCode, string>([
    [RoleCode.ADMIN_SYSTEM, 'Admin Sistem'],
    [RoleCode.EXECUTIVE, 'Deputi II'],
    [RoleCode.REGIONAL_COMMANDER, 'Kepala BIN Daerah (Kabinda)'],
    [RoleCode.FIELD_COORDINATOR, 'Koordinator Wilayah (Korwil)'],
    [RoleCode.FIELD_OFFICER, 'Petugas Wilayah (Gaswil)'],
  ]);

  for (const [code, name] of roleLabels.entries()) {
    await prisma.role.updateMany({
      where: { code },
      data: { name },
    });
  }
}

async function archiveLegacyDemoAccounts() {
  const legacyEmails = [
    'executive@denscakra.local',
    'binda@denscakra.local',
    'deputi.2.granted@denscakra.local',
    'deputi.denscakra.440c09ed@denscakra.local',
    'deputidens@local.id',
    'regionaljakarta@gmail.com',
  ];

  const legacyUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: { in: legacyEmails } },
        { email: { startsWith: 'fc.jakarta.', endsWith: '@denscakra.local' } },
      ],
    },
    select: { id: true },
  });
  const userIds = legacyUsers.map((user) => user.id);

  if (!userIds.length) return;

  await prisma.$transaction(async (tx) => {
    const profiles = await tx.userProfile.findMany({
      where: { authUserId: { in: userIds } },
      select: { id: true },
    });
    const profileIds = profiles.map((profile) => profile.id);
    const assignments = await tx.userOperationalAssignment.findMany({
      where: {
        userProfileId: { in: profileIds },
        validUntil: null,
      },
      select: { id: true },
    });
    const assignmentIds = assignments.map((assignment) => assignment.id);

    if (assignmentIds.length) {
      await tx.userAreaScope.updateMany({
        where: {
          operationalAssignmentId: { in: assignmentIds },
          validUntil: null,
        },
        data: { validUntil: seedEffectiveFrom },
      });
    }

    if (profileIds.length) {
      await tx.userOperationalAssignment.updateMany({
        where: {
          userProfileId: { in: profileIds },
          validUntil: null,
        },
        data: {
          isPrimary: false,
          isActive: false,
          validUntil: seedEffectiveFrom,
        },
      });
      await tx.userProfile.updateMany({
        where: { id: { in: profileIds } },
        data: {
          status: UserProfileStatus.ARCHIVED,
          isActive: false,
        },
      });
    }

    await tx.user.updateMany({
      where: { id: { in: userIds } },
      data: {
        banned: true,
        banReason:
          'Akun legacy/demo telah digantikan oleh akun kanonis sesuai glosarium sistem.',
      },
    });
  });
}

function buildTerritorialAccounts(
  topology: Awaited<ReturnType<typeof loadActiveAreas>>,
) {
  const accounts: SeedAccount[] = [];

  for (const province of topology.provinces) {
    const provinceCode = province.officialCode ?? province.code;
    accounts.push({
      email: `kabinda.${compactAreaCode(provinceCode)}@denscakra.local`,
      name: `Kepala BIN Daerah (Kabinda) ${province.name}`,
      password: defaultDemoPassword,
      username: `kabinda.${compactAreaCode(provinceCode)}`,
      systemRole: SYSTEM_ROLES.REGIONAL_COMMANDER,
      roleCode: RoleCode.REGIONAL_COMMANDER,
      branch: CommandRouteType.BINDA,
      scopeGroup: 'AREA_CODES',
      areaCodes: [provinceCode],
    });
  }

  for (const regencyCity of topology.regencyCities) {
    const regencyCityCode = regencyCity.officialCode ?? regencyCity.code;
    accounts.push({
      email: `korwil.${compactAreaCode(regencyCityCode)}@denscakra.local`,
      name: `Koordinator Wilayah (Korwil) ${regencyCity.name}`,
      password: defaultDemoPassword,
      username: `korwil.${compactAreaCode(regencyCityCode)}`,
      systemRole: SYSTEM_ROLES.FIELD_COORDINATOR,
      roleCode: RoleCode.FIELD_COORDINATOR,
      branch: CommandRouteType.BINDA,
      scopeGroup: 'AREA_CODES',
      areaCodes: [regencyCityCode],
    });
  }

  for (const { district } of topology.dkiDistricts) {
    const districtCode = district.officialCode ?? district.code;
    accounts.push({
      email: `gaswil.${compactAreaCode(districtCode)}@denscakra.local`,
      name: `Gaswil ${district.name}`,
      password: defaultDemoPassword,
      username: `gaswil.${compactAreaCode(districtCode)}`,
      systemRole: SYSTEM_ROLES.FIELD_OFFICER,
      roleCode: RoleCode.FIELD_OFFICER,
      branch: CommandRouteType.BINDA,
      scopeGroup: 'AREA_CODES',
      areaCodes: [districtCode],
    });
  }

  return accounts;
}

function uniqueAccounts(accounts: readonly SeedAccount[]) {
  const unique = new Map<string, SeedAccount>();
  for (const account of accounts) {
    unique.set(account.email, account);
  }
  return [...unique.values()];
}

async function logSeedSummary(accounts: SeedAccount[]) {
  const roleCounts = new Map<SystemRole, number>();
  for (const account of accounts) {
    roleCounts.set(
      account.systemRole,
      (roleCounts.get(account.systemRole) ?? 0) + 1,
    );
  }

  console.log('Ringkasan seed akun role:');
  for (const role of SYSTEM_ROLE_CATALOG) {
    console.log(`- ${role.label}: ${roleCounts.get(role.key) ?? 0} akun`);
  }

  const activeAssignments = await prisma.userOperationalAssignment.count({
    where: { isActive: true, validUntil: null },
  });
  const activeScopes = await prisma.userAreaScope.count({
    where: { validUntil: null },
  });

  console.log(`- Assignment aktif: ${activeAssignments}`);
  console.log(`- Cakupan wilayah aktif: ${activeScopes}`);
  console.log(
    '- Supervisi DKI Direktorat/Ditwil memakai kota/kabupaten dari master wilayah; admin dapat mengubah mapping melalui panel pengguna.',
  );
}

async function seedRoleAccounts() {
  const topology = await loadActiveAreas();
  await syncRoleLabels();
  await archiveLegacyDemoAccounts();

  const accounts = uniqueAccounts([
    ...baselineAccounts,
    ...buildTerritorialAccounts(topology),
  ]);

  for (const account of accounts) {
    const expectedRoleCode = AUTH_ROLE_TO_DOMAIN_ROLE[account.systemRole];
    if (expectedRoleCode !== account.roleCode) {
      throw new Error(
        `Role akun ${account.email} tidak sinkron: ${account.systemRole} -> ${expectedRoleCode}, bukan ${account.roleCode}.`,
      );
    }

    const profile = await ensureUser(account);
    const areas = resolveScopeAreas(account, topology);
    await ensureOperationalAssignment(account, profile.id, areas);
  }

  await logSeedSummary(accounts);
}

void seedRoleAccounts()
  .catch((error: unknown) => {
    console.error('Gagal membuat seed akun role.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
