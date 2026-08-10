import { auth } from '../lib/auth.js';
import { prisma } from '../modules/prisma/prisma.service.js';
import { SYSTEM_ROLES } from '../common/constants/system-role.js';
import { UserProfileStatus } from '../generated/prisma/client.js';
import { ensureUserProfileForAuthUser } from '../lib/user-profile.js';

const executiveAccount = {
  email: 'deputi@denscakra.local',
  name: 'Deputi II',
  username: 'deputi.2.bin',
  password: 'DensCakraDemo123!',
  role: SYSTEM_ROLES.EXECUTIVE,
} as const;

async function seedExecutive() {
  const existing = await prisma.user.findUnique({
    where: {
      email: executiveAccount.email,
    },
  });

  if (!existing) {
    await auth.api.signUpEmail({
      body: {
        email: executiveAccount.email,
        password: executiveAccount.password,
        name: executiveAccount.name,
      },
    });
  }

  await prisma.user.update({
    where: {
      email: executiveAccount.email,
    },
    data: {
      name: executiveAccount.name,
      username: executiveAccount.username,
      displayUsername: executiveAccount.username,
      emailVerified: true,
      role: executiveAccount.role,
      banned: false,
      banReason: null,
      banExpires: null,
    },
  });

  const executiveUser = await prisma.user.findUniqueOrThrow({
    where: {
      email: executiveAccount.email,
    },
    select: {
      id: true,
      name: true,
    },
  });

  await ensureUserProfileForAuthUser({
    authUserId: executiveUser.id,
    fullName: executiveUser.name,
    username: executiveAccount.username,
    status: UserProfileStatus.ACTIVE,
  });

  console.log(
    `Akun Deputi II siap: ${executiveAccount.email} -> ${executiveAccount.role}`,
  );
}

void seedExecutive()
  .catch((error: unknown) => {
    console.error('Gagal membuat seed akun Deputi II.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
