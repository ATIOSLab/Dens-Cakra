import { UserProfileStatus } from '../generated/prisma/client.js';
import { prisma } from '../modules/prisma/prisma.service.js';

type EnsureUserProfileInput = {
  authUserId: string;
  fullName?: string | null;
  status?: UserProfileStatus;
};

function isActiveStatus(status: UserProfileStatus) {
  return status === UserProfileStatus.ACTIVE;
}

export async function ensureUserProfileForAuthUser(
  input: EnsureUserProfileInput,
) {
  const nextStatus = input.status;

  return prisma.userProfile.upsert({
    where: {
      authUserId: input.authUserId,
    },
    update: {
      ...(input.fullName === undefined ? {} : { fullName: input.fullName }),
      ...(nextStatus === undefined
        ? {}
        : {
            status: nextStatus,
            isActive: isActiveStatus(nextStatus),
          }),
      deletedAt: null,
    },
    create: {
      authUserId: input.authUserId,
      fullName: input.fullName ?? null,
      status: nextStatus ?? UserProfileStatus.PENDING,
      isActive: isActiveStatus(nextStatus ?? UserProfileStatus.PENDING),
    },
  });
}

export async function getUserProfileIdForAuthUser(authUserId: string) {
  const profile = await prisma.userProfile.findUnique({
    where: {
      authUserId,
    },
    select: {
      id: true,
    },
  });

  return profile?.id ?? null;
}

export async function touchUserProfileLastLogin(authUserId: string) {
  await prisma.userProfile.updateMany({
    where: {
      authUserId,
    },
    data: {
      lastLoginAt: new Date(),
    },
  });
}
