import { auth } from '../lib/auth.js';
import { env } from '../lib/env.js';
import {
  SYSTEM_ROLE_CATALOG,
  SYSTEM_ROLES,
  type SystemRole,
} from '../common/constants/system-role.js';
import {
  Classification,
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
  clearanceLevel: Classification;
};

const defaultDemoPassword = 'DensCakraDemo123!';
const seedEffectiveFrom = new Date('2026-01-01T00:00:00.000Z');

const seedAccounts: SeedAccount[] = [
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
  {
    email: 'regional.commander@denscakra.local',
    name: 'Regional Commander Demo',
    password: defaultDemoPassword,
    role: SYSTEM_ROLES.REGIONAL_COMMANDER,
  },
  {
    email: 'oim@denscakra.local',
    name: 'Kasubdit Demo',
    password: defaultDemoPassword,
    role: SYSTEM_ROLES.OPERATIONAL_INTELLIGENCE_MANAGER,
  },
  {
    email: 'field.coordinator@denscakra.local',
    name: 'Korwil Demo',
    password: defaultDemoPassword,
    role: SYSTEM_ROLES.FIELD_COORDINATOR,
  },
  {
    email: 'field.officer@denscakra.local',
    name: 'Petugas Organik Demo',
    password: defaultDemoPassword,
    role: SYSTEM_ROLES.FIELD_OFFICER,
  },
];

const organizationSeeds: readonly OrganizationSeed[] = [
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
  {
    code: 'ORG-DIRECTORATE-ACEH',
    name: 'Direktorat Wilayah Aceh',
    type: OrganizationType.DIRECTORATE,
    parentCode: 'ORG-DEPUTI-II',
  },
  {
    code: 'ORG-SUBDIRECTORATE-ACEH-BARAT',
    name: 'Subdirektorat Aceh Barat',
    type: OrganizationType.SUBDIRECTORATE,
    parentCode: 'ORG-DIRECTORATE-ACEH',
  },
  {
    code: 'ORG-FCU-ACEH-BARAT',
    name: 'Field Coordination Unit Aceh Barat',
    type: OrganizationType.FIELD_COORDINATION_UNIT,
    parentCode: 'ORG-SUBDIRECTORATE-ACEH-BARAT',
  },
  {
    code: 'ORG-BINDA-ACEH',
    name: 'Binda Aceh',
    type: OrganizationType.BINDA,
    parentCode: 'ORG-DEPUTI-II',
  },
  {
    code: 'ORG-BAGOPS-ACEH',
    name: 'Bagops Binda Aceh',
    type: OrganizationType.BAGOPS,
    parentCode: 'ORG-BINDA-ACEH',
  },
  {
    code: 'ORG-FCU-BINDA-ACEH',
    name: 'Field Coordination Unit Binda Aceh',
    type: OrganizationType.FIELD_COORDINATION_UNIT,
    parentCode: 'ORG-BAGOPS-ACEH',
  },
] as const;

const positionSeeds: readonly PositionSeed[] = [
  {
    key: 'admin',
    code: PositionCode.ADMIN,
    title: 'Admin Sistem',
    roleCode: RoleCode.ADMIN_SYSTEM,
    organizationUnitCode: 'ORG-ADMIN-SYSTEM',
  },
  {
    key: 'executive',
    code: PositionCode.DEPUTI_II,
    title: 'Deputi II',
    roleCode: RoleCode.EXECUTIVE,
    organizationUnitCode: 'ORG-DEPUTI-II',
  },
  {
    key: 'director',
    code: PositionCode.DIREKTUR_WILAYAH,
    title: 'Direktur Wilayah Aceh',
    roleCode: RoleCode.REGIONAL_COMMANDER,
    organizationUnitCode: 'ORG-DIRECTORATE-ACEH',
    reportsToKey: 'executive',
  },
  {
    key: 'kasubdit',
    code: PositionCode.KASUBDIT,
    title: 'Kasubdit Aceh Barat',
    roleCode: RoleCode.OPERATIONAL_INTELLIGENCE_MANAGER,
    organizationUnitCode: 'ORG-SUBDIRECTORATE-ACEH-BARAT',
    reportsToKey: 'director',
  },
  {
    key: 'staf-subdit',
    code: PositionCode.STAF_SUBDIT,
    title: 'Staf Subdit Operasional',
    roleCode: RoleCode.FIELD_COORDINATOR,
    organizationUnitCode: 'ORG-SUBDIRECTORATE-ACEH-BARAT',
    reportsToKey: 'kasubdit',
  },
  {
    key: 'korwil-directorate',
    code: PositionCode.KORWIL,
    title: 'Korwil Aceh Barat',
    roleCode: RoleCode.FIELD_COORDINATOR,
    organizationUnitCode: 'ORG-FCU-ACEH-BARAT',
    reportsToKey: 'kasubdit',
  },
  {
    key: 'field-officer',
    code: PositionCode.PETUGAS_ORGANIK,
    title: 'Petugas Organik Aceh Barat',
    roleCode: RoleCode.FIELD_OFFICER,
    organizationUnitCode: 'ORG-FCU-ACEH-BARAT',
    reportsToKey: 'korwil-directorate',
  },
  {
    key: 'kabinda',
    code: PositionCode.KABINDA,
    title: 'Kabinda Aceh',
    roleCode: RoleCode.REGIONAL_COMMANDER,
    organizationUnitCode: 'ORG-BINDA-ACEH',
    reportsToKey: 'executive',
  },
  {
    key: 'kabagops',
    code: PositionCode.KABAGOPS,
    title: 'Kabagops Binda Aceh',
    roleCode: RoleCode.OPERATIONAL_INTELLIGENCE_MANAGER,
    organizationUnitCode: 'ORG-BAGOPS-ACEH',
    reportsToKey: 'kabinda',
  },
  {
    key: 'korwil-binda',
    code: PositionCode.KORWIL,
    title: 'Korwil Binda Aceh',
    roleCode: RoleCode.FIELD_COORDINATOR,
    organizationUnitCode: 'ORG-FCU-BINDA-ACEH',
    reportsToKey: 'kabagops',
  },
] as const;

const assignmentSeeds: readonly AssignmentSeed[] = [
  {
    email: env.bootstrapAdmin.email,
    positionKey: 'admin',
    areaCodes: ['IDN'],
    clearanceLevel: Classification.SANGAT_RAHASIA,
  },
  {
    email: 'executive@denscakra.local',
    positionKey: 'executive',
    areaCodes: ['IDN'],
    clearanceLevel: Classification.SANGAT_RAHASIA,
  },
  {
    email: 'regional.commander@denscakra.local',
    positionKey: 'director',
    areaCodes: ['11'],
    clearanceLevel: Classification.RAHASIA,
  },
  {
    email: 'oim@denscakra.local',
    positionKey: 'kasubdit',
    areaCodes: ['11'],
    clearanceLevel: Classification.RAHASIA,
  },
  {
    email: 'field.coordinator@denscakra.local',
    positionKey: 'korwil-directorate',
    areaCodes: ['11.05'],
    clearanceLevel: Classification.TERBATAS,
  },
  {
    email: 'field.officer@denscakra.local',
    positionKey: 'field-officer',
    areaCodes: ['11.05.07'],
    clearanceLevel: Classification.BIASA,
  },
] as const;

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

async function ensureOrganizationBaseline() {
  await prisma.$transaction(async (tx) => {
    for (const seed of organizationSeeds) {
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
          in: organizationSeeds.map((seed) => seed.code),
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

    for (const seed of positionSeeds) {
      const seatCode = `SEED-${seed.key.toUpperCase()}`;
      const organizationUnit = unitByCode.get(seed.organizationUnitCode);
      const roleId = roleIdByCode.get(seed.roleCode);

      if (!organizationUnit || !roleId) {
        throw new Error(
          `Missing baseline dependency for position ${seed.key}.`,
        );
      }

      const reportsToPositionId = seed.reportsToKey
        ? (positionByKey.get(seed.reportsToKey)?.id ?? null)
        : null;

      const existingPosition = await tx.position.findFirst({
        where: {
          code: seed.code,
          title: seed.title,
          organizationUnitId: organizationUnit.id,
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
              seatCode,
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
              seatCode,
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
            in: assignmentSeeds.map((seed) => seed.email),
          },
        },
      },
      select: {
        id: true,
        authUserId: true,
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
            new Set(assignmentSeeds.flatMap((seed) => seed.areaCodes)),
          ),
        },
      },
      select: {
        id: true,
        officialCode: true,
        level: true,
      },
    });

    const areaByCode = new Map(
      areas.map((area) => [area.officialCode ?? '', area]),
    );

    for (const seed of assignmentSeeds) {
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
          clearanceLevel: seed.clearanceLevel,
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
  });
}

async function seedRoleAccounts() {
  for (const account of seedAccounts) {
    await ensureUser(account);
  }

  await ensureOrganizationBaseline();

  const users = await prisma.user.findMany({
    where: {
      email: {
        in: seedAccounts.map((account) => account.email),
      },
    },
    orderBy: {
      email: 'asc',
    },
    select: {
      email: true,
      name: true,
      role: true,
      emailVerified: true,
      profile: {
        select: {
          status: true,
          clearanceLevel: true,
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
                      type: true,
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
                      level: true,
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

  console.log('Seeded role accounts:');

  for (const user of users) {
    const roleLabel =
      SYSTEM_ROLE_CATALOG.find((role) => role.key === user.role)?.label ??
      user.role;
    const primaryAssignment = user.profile?.positionAssignments[0];
    const primaryAreas =
      primaryAssignment?.areaScopes
        .map((scope) => scope.area.officialCode ?? scope.area.level)
        .join(', ') ?? 'none';

    console.log(
      `- ${roleLabel}: ${user.email} (verified=${String(user.emailVerified)}, profileStatus=${user.profile?.status ?? 'NONE'}, clearance=${user.profile?.clearanceLevel ?? 'NONE'}, position=${primaryAssignment?.position.code ?? 'NONE'}, unit=${primaryAssignment?.position.organizationUnit.code ?? 'NONE'}, areas=${primaryAreas})`,
    );
  }
}

void seedRoleAccounts()
  .catch((error: unknown) => {
    console.error('Failed to seed role accounts.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
