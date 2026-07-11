import { auth } from '../lib/auth.js';
import { env } from '../lib/env.js';
import {
  SYSTEM_ROLE_CATALOG,
  SYSTEM_ROLES,
  type SystemRole,
} from '../common/constants/system-role.js';
import { prisma } from '../modules/prisma/prisma.service.js';

type SeedAccount = {
  email: string;
  name: string;
  password: string;
  role: SystemRole;
};

const defaultDemoPassword = 'DensCakraDemo123!';

const seedAccounts: SeedAccount[] = [
  {
    email: env.bootstrapAdmin.email,
    name: env.bootstrapAdmin.name,
    password: env.bootstrapAdmin.password,
    role: SYSTEM_ROLES.ADMIN_SYSTEM,
  },
  {
    email: 'executive@denscakra.local',
    name: 'Executive Demo',
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
    name: 'Operational Intelligence Manager Demo',
    password: defaultDemoPassword,
    role: SYSTEM_ROLES.OPERATIONAL_INTELLIGENCE_MANAGER,
  },
  {
    email: 'field.coordinator@denscakra.local',
    name: 'Field Coordinator Demo',
    password: defaultDemoPassword,
    role: SYSTEM_ROLES.FIELD_COORDINATOR,
  },
  {
    email: 'field.officer@denscakra.local',
    name: 'Field Officer Bangkinang',
    password: defaultDemoPassword,
    role: SYSTEM_ROLES.FIELD_OFFICER,
  },
  {
    email: 'field.officer.bangkinang@denscakra.local',
    name: 'Field Officer Bangkinang',
    password: defaultDemoPassword,
    role: SYSTEM_ROLES.FIELD_OFFICER,
  },
  {
    email: 'field.officer.pekanbaru@denscakra.local',
    name: 'Field Officer Pekanbaru',
    password: defaultDemoPassword,
    role: SYSTEM_ROLES.FIELD_OFFICER,
  },
];

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
}

async function seedRoleAccounts() {
  const activeSeedEmails = seedAccounts.map((account) => account.email);

  await prisma.user.deleteMany({
    where: {
      role: SYSTEM_ROLES.FIELD_OFFICER,
      email: {
        endsWith: '@denscakra.local',
        notIn: activeSeedEmails,
      },
    },
  });

  for (const account of seedAccounts) {
    await ensureUser(account);
  }

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
    },
  });

  console.log('Seeded role accounts:');

  for (const user of users) {
    const roleLabel =
      SYSTEM_ROLE_CATALOG.find((role) => role.key === user.role)?.label ?? user.role;

    console.log(
      `- ${roleLabel}: ${user.email} (verified=${String(user.emailVerified)})`,
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
