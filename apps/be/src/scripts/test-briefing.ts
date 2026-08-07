process.env.DATABASE_URL = 'postgresql://postgres:prdktw9eh2b4ebet@148.230.98.12:5434/postgres';
import { PrismaClient } from '../generated/prisma/client.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Testing raw queries and Prisma calls for Regional Commander...');

  try {
    const assignment = await prisma.userOperationalAssignment.findFirst({
      where: { role: { code: 'REGIONAL_COMMANDER' } },
      include: { role: true, userProfile: true }
    });

    console.log('Assignment found:', assignment?.id);

    const primaryAssignmentId = assignment?.id || 'test';

    // Query 1: baket count
    const bakets = await prisma.baket.count({
      where: { deletedAt: null }
    });
    console.log('Bakets count:', bakets);

    // Query 2: task count
    const tasks = await prisma.task.count({
      where: {
        OR: [
          { ownerAssignmentId: primaryAssignmentId },
          { assignments: { some: { assigneeId: primaryAssignmentId } } },
        ],
        deletedAt: null,
      }
    });
    console.log('Tasks count:', tasks);

    // Query 3: directive count
    const directives = await prisma.directive.count({
      where: { ownerAssignmentId: primaryAssignmentId }
    });
    console.log('Directives count:', directives);

    // Query 4: products count
    const products = await prisma.intelligenceProduct.count({
      where: { deletedAt: null, ownerAssignmentId: primaryAssignmentId }
    });
    console.log('Products count:', products);

    // Query 5: alerts count
    const alerts = await prisma.alert.count({});
    console.log('Alerts count:', alerts);

    // Query 6: emergencies count
    const emergencies = await prisma.emergencyIncident.count({});
    console.log('Emergencies count:', emergencies);

    // Query 7: task grouped
    const taskGrouped = await prisma.task.groupBy({
      by: ['status'],
      where: { ownerAssignmentId: primaryAssignmentId, deletedAt: null },
      _count: { _all: true }
    });
    console.log('Task grouped:', taskGrouped);

    // Query 8: verification grouped
    const verificationGrouped = await prisma.baketVerification.groupBy({
      by: ['status'],
      _count: { _all: true }
    });
    console.log('Verification grouped:', verificationGrouped);

    // Query 9: product approval step count
    const approvalBacklog = await prisma.productApprovalStep.count({
      where: {
        status: 'ACTIVE',
        workflow: {
          productVersion: {
            product: { ownerAssignmentId: primaryAssignmentId }
          }
        }
      }
    });
    console.log('Approval backlog:', approvalBacklog);

    // Query 10: product status groupBy
    const productGrouped = await prisma.intelligenceProduct.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { _all: true }
    });
    console.log('Product grouped:', productGrouped);

    // Query 11: list alerts
    const alertItems = await prisma.alert.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        eventArea: true
      }
    });
    console.log('Alert items count:', alertItems.length);

    // Query 12: list emergency incidents
    const emergencyItems = await prisma.emergencyIncident.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        eventArea: true
      }
    });
    console.log('Emergency items count:', emergencyItems.length);

    console.log('\nAll queries succeeded cleanly!');

  } catch (err: any) {
    console.error('Prisma test error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
