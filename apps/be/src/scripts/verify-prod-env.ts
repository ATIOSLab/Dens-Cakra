import { env } from '../lib/env.js';
import { prisma } from '../modules/prisma/prisma.service.js';

async function main() {
  console.log('env.databaseUrl is:', env.databaseUrl);
  const userCount = await prisma.user.count();
  console.log('User count via Prisma:', userCount);
}

main().catch(console.error);
