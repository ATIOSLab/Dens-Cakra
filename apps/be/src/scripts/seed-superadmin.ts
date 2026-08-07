import { auth } from '../lib/auth.js';
import { SYSTEM_ROLES } from '../common/constants/system-role.js';
import { env } from '../lib/env.js';
import {
  AdministrativeLevel,
  CommandRouteType,
  RoleCode,
  UserProfileStatus,
} from '../generated/prisma/client.js';
import { prisma } from '../modules/prisma/prisma.service.js';
import { ensureUserProfileForAuthUser } from '../lib/user-profile.js';

async function seedSuperAdmin() {
  const existing = await prisma.user.findUnique({
    where: {
      email: env.bootstrapSuperAdmin.email,
    },
  });

  if (!existing) {
    await auth.api.signUpEmail({
      body: {
        email: env.bootstrapSuperAdmin.email,
        password: env.bootstrapSuperAdmin.password,
        name: env.bootstrapSuperAdmin.name,
      },
    });
  }

  await prisma.user.update({
    where: {
      email: env.bootstrapSuperAdmin.email,
    },
    data: {
      name: env.bootstrapSuperAdmin.name,
      emailVerified: true,
      role: SYSTEM_ROLES.ADMIN_SYSTEM,
      banned: false,
      banReason: null,
      banExpires: null,
    },
  });

  const superAdminUser = await prisma.user.findUniqueOrThrow({
    where: {
      email: env.bootstrapSuperAdmin.email,
    },
    select: {
      id: true,
      name: true,
    },
  });

  const profile = await ensureUserProfileForAuthUser({
    authUserId: superAdminUser.id,
    fullName: superAdminUser.name,
    status: UserProfileStatus.ACTIVE,
  });

  const adminRole = await prisma.role.findUnique({
    where: { code: RoleCode.ADMIN_SYSTEM },
  });

  const countryArea = await prisma.administrativeArea.findFirst({
    where: { level: AdministrativeLevel.COUNTRY, isActive: true },
  });

  if (adminRole && countryArea) {
    let assignment = await prisma.userOperationalAssignment.findFirst({
      where: {
        userProfileId: profile.id,
        roleId: adminRole.id,
        isPrimary: true,
        isActive: true,
        validUntil: null,
      },
    });

    if (!assignment) {
      assignment = await prisma.userOperationalAssignment.create({
        data: {
          userProfileId: profile.id,
          roleId: adminRole.id,
          branch: CommandRouteType.PUSAT,
          isPrimary: true,
          isActive: true,
          validFrom: new Date('2026-01-01T00:00:00.000Z'),
        },
      });
    }

    const areaScope = await prisma.userAreaScope.findFirst({
      where: {
        operationalAssignmentId: assignment.id,
        areaId: countryArea.id,
        validUntil: null,
      },
    });

    if (!areaScope) {
      await prisma.userAreaScope.create({
        data: {
          operationalAssignmentId: assignment.id,
          areaId: countryArea.id,
          isPrimary: true,
          validFrom: new Date('2026-01-01T00:00:00.000Z'),
        },
      });
    }
  }

  console.log(
    `Superadmin ready: ${env.bootstrapSuperAdmin.email} -> ${SYSTEM_ROLES.ADMIN_SYSTEM}`,
  );
}

void seedSuperAdmin()
  .catch((error: unknown) => {
    console.error('Failed to seed superadmin.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
