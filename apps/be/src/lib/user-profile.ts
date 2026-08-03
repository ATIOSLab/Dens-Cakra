import { UserProfileStatus } from '../generated/prisma/client.js';
import { prisma } from '../modules/prisma/prisma.service.js';

type EnsureUserProfileInput = {
  authUserId: string;
  fullName?: string | null;
  username?: string | null;
  status?: UserProfileStatus;
};

function isActiveStatus(status: UserProfileStatus) {
  return status === UserProfileStatus.ACTIVE;
}

export async function ensureUserProfileForAuthUser(
  input: EnsureUserProfileInput,
) {
  const nextStatus = input.status;

  if (input.username) {
    await prisma.user.updateMany({
      where: {
        id: input.authUserId,
      },
      data: {
        username: input.username,
        displayUsername: input.username,
      },
    });
  }

  return prisma.userProfile.upsert({
    where: {
      authUserId: input.authUserId,
    },
    update: {
      ...(input.fullName === undefined ? {} : { fullName: input.fullName }),
      ...(input.username === undefined ? {} : { username: input.username }),
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
      username: input.username ?? null,
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
