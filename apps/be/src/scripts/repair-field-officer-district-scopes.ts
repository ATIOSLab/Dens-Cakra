import { auth } from '../lib/auth.js';
import { SYSTEM_ROLES } from '../common/constants/system-role.js';
import { ensureUserProfileForAuthUser } from '../lib/user-profile.js';
import {
  AdministrativeLevel,
  CommandRouteType,
  PositionCode,
  RoleCode,
  UserProfileStatus,
} from '../generated/prisma/client.js';
import { prisma } from '../modules/prisma/prisma.service.js';

const defaultDemoPassword = 'DensCakraDemo123!';
const seedEffectiveFrom = new Date('2026-01-01T00:00:00.000Z');
const JAKARTA_PROVINCE_CODE = '31';

function compactAreaCode(code: string) {
  return code.replace(/\./g, '');
}

function routeMeta(branch: CommandRouteType | null) {
  if (branch === CommandRouteType.DIRECTORATE) {
    return {
      emailPrefix: 'dir',
      seatPrefix: 'AGD',
      titlePrefix: 'Petugas Organik Direktorat',
      namePrefix: 'Agent Direktorat',
    };
  }

  return {
    emailPrefix: 'binda',
    seatPrefix: 'AGB',
    titlePrefix: 'Petugas Organik Binda',
    namePrefix: 'Agent Binda',
  };
}

async function ensureUser(input: { email: string; name: string }) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (!existing) {
    await auth.api.signUpEmail({
      body: {
        email: input.email,
        password: defaultDemoPassword,
        name: input.name,
      },
    });
  }

  const user = await prisma.user.update({
    where: { email: input.email },
    data: {
      name: input.name,
      emailVerified: true,
      role: SYSTEM_ROLES.FIELD_OFFICER,
      banned: false,
      banReason: null,
      banExpires: null,
    },
    select: { id: true, name: true },
  });

  return ensureUserProfileForAuthUser({
    authUserId: user.id,
    fullName: user.name,
    status: UserProfileStatus.ACTIVE,
  });
}

async function ensurePosition(input: {
  seatCode: string;
  title: string;
  roleId: string;
  organizationUnitId: string;
  reportsToPositionId: string;
  branch: CommandRouteType | null;
}) {
  const existing = await prisma.position.findUnique({
    where: { seatCode: input.seatCode },
    select: { id: true },
  });

  const data = {
    code: PositionCode.PETUGAS_ORGANIK,
    title: input.title,
    roleId: input.roleId,
    organizationUnitId: input.organizationUnitId,
    reportsToPositionId: input.reportsToPositionId,
    branch: input.branch,
    isActive: true,
  };

  return existing
    ? prisma.position.update({
        where: { id: existing.id },
        data,
        select: {
          id: true,
          roleId: true,
          organizationUnitId: true,
          branch: true,
        },
      })
    : prisma.position.create({
        data: {
          seatCode: input.seatCode,
          ...data,
        },
        select: {
          id: true,
          roleId: true,
          organizationUnitId: true,
          branch: true,
        },
      });
}

async function ensureSeat(position: {
  id: string;
  roleId: string;
  organizationUnitId: string;
  branch: CommandRouteType | null;
}) {
  const existing = await prisma.organizationRoleSeat.findFirst({
    where: { positionId: position.id },
    select: { id: true },
  });

  return existing
    ? prisma.organizationRoleSeat.update({
        where: { id: existing.id },
        data: { positionId: position.id, isActive: true },
        select: { id: true },
      })
    : prisma.organizationRoleSeat.create({
        data: {
          roleId: position.roleId,
          organizationUnitId: position.organizationUnitId,
          branch: position.branch,
          positionId: position.id,
          isActive: true,
        },
        select: { id: true },
      });
}

async function syncPositionCoverage(positionId: string, areaId: string) {
  await prisma.positionAreaCoverage.updateMany({
    where: {
      positionId,
      validUntil: null,
      areaId: { not: areaId },
    },
    data: {
      isPrimary: false,
      validUntil: seedEffectiveFrom,
    },
  });

  const existing = await prisma.positionAreaCoverage.findFirst({
    where: { positionId, areaId, validUntil: null },
    select: { id: true },
  });

  if (existing) {
    await prisma.positionAreaCoverage.update({
      where: { id: existing.id },
      data: { isPrimary: true },
    });
    return;
  }

  await prisma.positionAreaCoverage.create({
    data: {
      positionId,
      areaId,
      isPrimary: true,
      validFrom: seedEffectiveFrom,
    },
  });
}

async function syncAssignment(input: {
  userProfileId: string;
  positionId: string;
  seatId: string;
  areaId: string;
}) {
  await prisma.userSeatAssignment.updateMany({
    where: {
      positionId: input.positionId,
      isActive: true,
      validUntil: null,
      NOT: { userProfileId: input.userProfileId },
    },
    data: {
      isActive: false,
      isPrimary: false,
      validUntil: seedEffectiveFrom,
    },
  });

  let assignment = await prisma.userSeatAssignment.findFirst({
    where: {
      userProfileId: input.userProfileId,
      positionId: input.positionId,
      isPrimary: true,
      validUntil: null,
    },
    select: { id: true },
  });

  if (!assignment) {
    await prisma.userSeatAssignment.updateMany({
      where: {
        userProfileId: input.userProfileId,
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

    assignment = await prisma.userSeatAssignment.create({
      data: {
        userProfileId: input.userProfileId,
        positionId: input.positionId,
        seatId: input.seatId,
        isPrimary: true,
        isActive: true,
        validFrom: seedEffectiveFrom,
      },
      select: { id: true },
    });
  } else {
    await prisma.userSeatAssignment.update({
      where: { id: assignment.id },
      data: {
        seatId: input.seatId,
        isActive: true,
        isPrimary: true,
        validUntil: null,
      },
    });
  }

  await prisma.positionAreaScope.updateMany({
    where: {
      positionAssignmentId: assignment.id,
      validUntil: null,
      areaId: { not: input.areaId },
    },
    data: { validUntil: seedEffectiveFrom },
  });

  const existingScope = await prisma.positionAreaScope.findFirst({
    where: {
      positionAssignmentId: assignment.id,
      areaId: input.areaId,
      validUntil: null,
    },
    select: { id: true },
  });

  if (existingScope) {
    await prisma.positionAreaScope.update({
      where: { id: existingScope.id },
      data: { isPrimary: true },
    });
    return assignment;
  }

  await prisma.positionAreaScope.create({
    data: {
      positionAssignmentId: assignment.id,
      areaId: input.areaId,
      isPrimary: true,
      validFrom: seedEffectiveFrom,
    },
  });

  return assignment;
}

async function retireBroadPosition(positionId: string) {
  await prisma.positionAreaScope.updateMany({
    where: {
      validUntil: null,
      assignment: { positionId },
    },
    data: { validUntil: seedEffectiveFrom },
  });

  await prisma.userSeatAssignment.updateMany({
    where: {
      positionId,
      isActive: true,
      validUntil: null,
    },
    data: {
      isActive: false,
      isPrimary: false,
      validUntil: seedEffectiveFrom,
    },
  });

  await prisma.positionAreaCoverage.updateMany({
    where: { positionId, validUntil: null },
    data: {
      isPrimary: false,
      validUntil: seedEffectiveFrom,
    },
  });

  await prisma.organizationRoleSeat.updateMany({
    where: { positionId, isActive: true },
    data: { isActive: false },
  });

  await prisma.position.update({
    where: { id: positionId },
    data: { isActive: false },
  });
}

async function preserveLegacyAreaAccount(input: {
  broadPosition: {
    id: string;
    branch: CommandRouteType | null;
    organizationUnitId: string;
    reportsToPositionId: string | null;
  };
  broadArea: {
    officialCode: string | null;
  };
  targetDistrict: {
    id: string;
    officialCode: string | null;
    name: string;
  };
  roleId: string;
}) {
  const broadAreaCode = input.broadArea.officialCode;
  const targetDistrictCode = input.targetDistrict.officialCode;

  if (
    !broadAreaCode ||
    !targetDistrictCode ||
    !input.broadPosition.reportsToPositionId
  ) {
    return null;
  }

  const meta = routeMeta(input.broadPosition.branch);
  const legacyEmail = `agent.${meta.emailPrefix}.${compactAreaCode(broadAreaCode)}@denscakra.local`;
  const legacyUser = await prisma.user.findUnique({
    where: { email: legacyEmail },
    select: {
      id: true,
      profile: {
        select: { id: true },
      },
    },
  });

  if (!legacyUser?.profile) {
    return null;
  }

  await prisma.user.update({
    where: { id: legacyUser.id },
    data: {
      name: `${meta.namePrefix} ${input.targetDistrict.name}`,
      role: SYSTEM_ROLES.FIELD_OFFICER,
      emailVerified: true,
      banned: false,
      banReason: null,
      banExpires: null,
    },
  });
  await prisma.userProfile.update({
    where: { id: legacyUser.profile.id },
    data: {
      fullName: `${meta.namePrefix} ${input.targetDistrict.name}`,
      status: UserProfileStatus.ACTIVE,
      isActive: true,
      deletedAt: null,
    },
  });

  const position = await ensurePosition({
    seatCode: `${meta.seatPrefix}-${compactAreaCode(targetDistrictCode)}`,
    title: `${meta.titlePrefix} ${input.targetDistrict.name}`,
    roleId: input.roleId,
    organizationUnitId: input.broadPosition.organizationUnitId,
    reportsToPositionId: input.broadPosition.reportsToPositionId,
    branch: input.broadPosition.branch,
  });
  const seat = await ensureSeat(position);
  await syncPositionCoverage(position.id, input.targetDistrict.id);
  await syncAssignment({
    userProfileId: legacyUser.profile.id,
    positionId: position.id,
    seatId: seat.id,
    areaId: input.targetDistrict.id,
  });

  return legacyEmail;
}

async function main() {
  const role = await prisma.role.findUniqueOrThrow({
    where: { code: RoleCode.FIELD_OFFICER },
    select: { id: true },
  });

  const broadPositions = await prisma.position.findMany({
    where: {
      code: PositionCode.PETUGAS_ORGANIK,
      isActive: true,
      branch: { in: [CommandRouteType.BINDA, CommandRouteType.DIRECTORATE] },
      areaCoverages: {
        some: {
          validUntil: null,
          area: {
            level: {
              in: [AdministrativeLevel.REGENCY, AdministrativeLevel.CITY],
            },
            officialCode: { startsWith: `${JAKARTA_PROVINCE_CODE}.` },
          },
        },
      },
    },
    include: {
      areaCoverages: {
        where: { validUntil: null },
        include: { area: true },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      },
    },
    orderBy: { seatCode: 'asc' },
  });

  let createdOrSyncedPositions = 0;
  let retiredPositions = 0;
  let preservedLegacyAccounts = 0;

  for (const broadPosition of broadPositions) {
    if (!broadPosition.reportsToPositionId) {
      continue;
    }

    const broadArea = broadPosition.areaCoverages.find(
      (coverage) =>
        coverage.area.officialCode?.startsWith(`${JAKARTA_PROVINCE_CODE}.`) &&
        (coverage.area.level === AdministrativeLevel.REGENCY ||
          coverage.area.level === AdministrativeLevel.CITY),
    )?.area;

    if (!broadArea) {
      continue;
    }

    const districts = await prisma.administrativeArea.findMany({
      where: {
        parentId: broadArea.id,
        level: AdministrativeLevel.DISTRICT,
        isActive: true,
        deletedAt: null,
        officialCode: { not: null },
      },
      orderBy: { officialCode: 'asc' },
      select: { id: true, officialCode: true, name: true },
    });

    if (districts.length === 0) {
      continue;
    }

    const meta = routeMeta(broadPosition.branch);

    for (const district of districts) {
      if (!district.officialCode) {
        continue;
      }

      const compactCode = compactAreaCode(district.officialCode);
      const profile = await ensureUser({
        email: `agent.${meta.emailPrefix}.${compactCode}@denscakra.local`,
        name: `${meta.namePrefix} ${district.name}`,
      });
      const position = await ensurePosition({
        seatCode: `${meta.seatPrefix}-${compactCode}`,
        title: `${meta.titlePrefix} ${district.name}`,
        roleId: role.id,
        organizationUnitId: broadPosition.organizationUnitId,
        reportsToPositionId: broadPosition.reportsToPositionId,
        branch: broadPosition.branch,
      });
      const seat = await ensureSeat(position);

      await syncPositionCoverage(position.id, district.id);
      await syncAssignment({
        userProfileId: profile.id,
        positionId: position.id,
        seatId: seat.id,
        areaId: district.id,
      });
      createdOrSyncedPositions += 1;
    }

    const preservedEmail = await preserveLegacyAreaAccount({
      broadPosition,
      broadArea,
      targetDistrict: districts[0],
      roleId: role.id,
    });
    if (preservedEmail) {
      preservedLegacyAccounts += 1;
    }

    await retireBroadPosition(broadPosition.id);
    retiredPositions += 1;
  }

  if (broadPositions.length === 0) {
    const retiredBroadPositions = await prisma.position.findMany({
      where: {
        code: PositionCode.PETUGAS_ORGANIK,
        isActive: false,
        branch: { in: [CommandRouteType.BINDA, CommandRouteType.DIRECTORATE] },
        areaCoverages: {
          some: {
            area: {
              level: {
                in: [AdministrativeLevel.REGENCY, AdministrativeLevel.CITY],
              },
              officialCode: { startsWith: `${JAKARTA_PROVINCE_CODE}.` },
            },
          },
        },
      },
      include: {
        areaCoverages: {
          include: { area: true },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: { seatCode: 'asc' },
    });

    for (const broadPosition of retiredBroadPositions) {
      const broadArea = broadPosition.areaCoverages.find(
        (coverage) =>
          coverage.area.officialCode?.startsWith(`${JAKARTA_PROVINCE_CODE}.`) &&
          (coverage.area.level === AdministrativeLevel.REGENCY ||
            coverage.area.level === AdministrativeLevel.CITY),
      )?.area;

      if (!broadArea) {
        continue;
      }

      const targetDistrict = await prisma.administrativeArea.findFirst({
        where: {
          parentId: broadArea.id,
          level: AdministrativeLevel.DISTRICT,
          isActive: true,
          deletedAt: null,
          officialCode: { not: null },
        },
        orderBy: { officialCode: 'asc' },
        select: { id: true, officialCode: true, name: true },
      });

      if (!targetDistrict) {
        continue;
      }

      const preservedEmail = await preserveLegacyAreaAccount({
        broadPosition,
        broadArea,
        targetDistrict,
        roleId: role.id,
      });
      if (preservedEmail) {
        preservedLegacyAccounts += 1;
      }
    }
  }

  console.log('Repaired field officer district scopes.');
  console.log(`- broad positions retired: ${retiredPositions}`);
  console.log(`- district positions synced: ${createdOrSyncedPositions}`);
  console.log(`- legacy area accounts preserved: ${preservedLegacyAccounts}`);
}

void main()
  .catch((error: unknown) => {
    console.error('Failed to repair field officer district scopes.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
