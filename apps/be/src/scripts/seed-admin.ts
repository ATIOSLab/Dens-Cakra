import { auth } from '../lib/auth.js';
import { env } from '../lib/env.js';
import { SYSTEM_ROLES } from '../common/constants/system-role.js';
import { prisma } from '../modules/prisma/prisma.service.js';

async function seedAdmin() {
  const existing = await prisma.user.findUnique({
    where: {
      email: env.bootstrapAdmin.email,
    },
  });

  if (!existing) {
    await auth.api.signUpEmail({
      body: {
        email: env.bootstrapAdmin.email,
        password: env.bootstrapAdmin.password,
        name: env.bootstrapAdmin.name,
      },
    });
  }

  await prisma.user.update({
    where: {
      email: env.bootstrapAdmin.email,
    },
    data: {
      emailVerified: true,
      role: SYSTEM_ROLES.ADMIN_SYSTEM,
    },
  });

  console.log(
    `Bootstrap admin ready: ${env.bootstrapAdmin.email} -> ${SYSTEM_ROLES.ADMIN_SYSTEM}`,
  );
}

void seedAdmin()
  .catch((error: unknown) => {
    console.error('Failed to seed bootstrap admin.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
