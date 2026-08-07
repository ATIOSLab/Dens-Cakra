import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  options: '-c timezone=UTC',
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // First, list ALL jaring to see their data
  const allJaring = await prisma.jaring.findMany({
    select: {
      id: true,
      aliasName: true,
      fullName: true,
      status: true,
      whatsappNumber: true,
    },
    orderBy: [{ aliasName: 'asc' }, { id: 'asc' }],
  });

  console.log('\n=== ALL JARING IN DATABASE ===');
  console.log(`Total jaring: ${allJaring.length}`);
  console.table(allJaring);

  // Also list all bakets
  const allBakets = await prisma.baket.findMany({
    select: {
      id: true,
      status: true,
      currentVersionNumber: true,
      createdAt: true,
      primaryJaringId: true,
      primaryJaring: {
        select: { id: true, aliasName: true, fullName: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log('\n=== ALL BAKETS IN DATABASE ===');
  console.log(`Total bakets: ${allBakets.length}`);
  console.table(allBakets);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
