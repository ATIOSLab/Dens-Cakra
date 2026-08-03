import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  options: '-c timezone=UTC',
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const baketIds = [
    'a8507976-15e9-4d69-a124-1aa02bec1562',
    '138760f6-6373-4c1b-b3d7-beaba5f0fcc3',
  ];

  console.log('=== PRE-DELETE AUDIT ===');

  // 1. List bakets to confirm
  const bakets = await prisma.baket.findMany({
    where: { id: { in: baketIds } },
    select: {
      id: true,
      status: true,
      primaryJaring: { select: { code: true, aliasName: true } },
    },
  });
  console.log(`Bakets to delete: ${bakets.length}`);
  for (const b of bakets) {
    console.log(`  ${b.id} | status=${b.status} | jaring=${b.primaryJaring?.code}/${b.primaryJaring?.aliasName}`);
  }

  // 2. Get all baket version IDs
  const versions = await prisma.baketVersion.findMany({
    where: { baketId: { in: baketIds } },
    select: { id: true, baketId: true, versionNumber: true },
  });
  const versionIds = versions.map((v) => v.id);
  console.log(`\nBaketVersions to cascade: ${versions.length}`);
  for (const v of versions) {
    console.log(`  ${v.id} (v${v.versionNumber}) | baket=${v.baketId}`);
  }

  // 3. Check verifications (FK: onDelete: Restrict on baketVersionId)
  const verifications = await prisma.baketVerification.findMany({
    where: { baketVersionId: { in: versionIds } },
    select: {
      id: true,
      baketVersionId: true,
      _count: { select: { checks: true, crossReferences: true, productSources: true, analysisSources: true } },
    },
  });
  console.log(`\nBaketVerifications: ${verifications.length}`);
  for (const v of verifications) {
    console.log(`  ${v.id} | checks=${v._count.checks} crossRefs=${v._count.crossReferences} productSrc=${v._count.productSources} analysisSrc=${v._count.analysisSources}`);
  }

  // 4. Check WhatsApp messages linked via convertedBaketId
  const linkedMsgCount = await prisma.whatsAppMessage.count({
    where: { convertedBaketId: { in: baketIds } },
  });
  console.log(`\nWhatsApp messages with convertedBaketId: ${linkedMsgCount}`);

  // 5. Check alerts
  const alertCount = await prisma.alert.count({
    where: { sourceBaketId: { in: baketIds } },
  });
  console.log(`Alerts linked: ${alertCount}`);

  console.log('\n=== STARTING DELETION (in transaction) ===');

  await prisma.$transaction(async (tx) => {
    const verificationIds = verifications.map((v) => v.id);

    // Step 1: Delete ProductSourceVerification linked to verifications
    if (verificationIds.length > 0) {
      const deletedProductSrc = await tx.productSourceVerification.deleteMany({
        where: { baketVerificationId: { in: verificationIds } },
      });
      console.log(`  Deleted ProductSourceVerification: ${deletedProductSrc.count}`);

      // Step 2: Delete AnalysisSourceVerification linked to verifications
      const deletedAnalysisSrc = await tx.analysisSourceVerification.deleteMany({
        where: { baketVerificationId: { in: verificationIds } },
      });
      console.log(`  Deleted AnalysisSourceVerification: ${deletedAnalysisSrc.count}`);

      // Step 3: Delete BaketVerificationCrossReference (onDelete: Cascade from verification)
      const deletedCrossRefs = await tx.baketVerificationCrossReference.deleteMany({
        where: { verificationId: { in: verificationIds } },
      });
      console.log(`  Deleted BaketVerificationCrossReference: ${deletedCrossRefs.count}`);

      // Step 4: Delete BaketVerificationCheck (onDelete: Cascade from verification)
      const deletedChecks = await tx.baketVerificationCheck.deleteMany({
        where: { verificationId: { in: verificationIds } },
      });
      console.log(`  Deleted BaketVerificationCheck: ${deletedChecks.count}`);

      // Step 5: Delete BaketVerification itself (Restrict on baketVersion)
      const deletedVerifications = await tx.baketVerification.deleteMany({
        where: { id: { in: verificationIds } },
      });
      console.log(`  Deleted BaketVerification: ${deletedVerifications.count}`);
    }

    // Step 6: Delete BaketCoverageCheck (onDelete: Cascade from baketVersion)
    const deletedCoverageChecks = await tx.baketCoverageCheck.deleteMany({
      where: { baketVersionId: { in: versionIds } },
    });
    console.log(`  Deleted BaketCoverageCheck: ${deletedCoverageChecks.count}`);

    // Step 7: Delete BaketVersionSourceMessage (onDelete: Cascade from baketVersion)
    const deletedSourceMsgs = await tx.baketVersionSourceMessage.deleteMany({
      where: { baketVersionId: { in: versionIds } },
    });
    console.log(`  Deleted BaketVersionSourceMessage: ${deletedSourceMsgs.count}`);

    // Step 8: Delete BaketVersionAttachment (onDelete: Cascade from baketVersion)
    const deletedAttachments = await tx.baketVersionAttachment.deleteMany({
      where: { baketVersionId: { in: versionIds } },
    });
    console.log(`  Deleted BaketVersionAttachment: ${deletedAttachments.count}`);

    // Step 9: Nullify convertedBaketId on WhatsApp messages (onDelete: SetNull)
    const updatedMsgs = await tx.whatsAppMessage.updateMany({
      where: { convertedBaketId: { in: baketIds } },
      data: { convertedBaketId: null },
    });
    console.log(`  Nullified WhatsAppMessage.convertedBaketId: ${updatedMsgs.count}`);

    // Step 10: Nullify Alert.sourceBaketId (onDelete: SetNull)
    const updatedAlerts = await tx.alert.updateMany({
      where: { sourceBaketId: { in: baketIds } },
      data: { sourceBaketId: null },
    });
    console.log(`  Nullified Alert.sourceBaketId: ${updatedAlerts.count}`);

    // Step 11: Delete BaketRevisionRequest (onDelete: Cascade from baket)
    const deletedRevisions = await tx.baketRevisionRequest.deleteMany({
      where: { baketId: { in: baketIds } },
    });
    console.log(`  Deleted BaketRevisionRequest: ${deletedRevisions.count}`);

    // Step 12: Delete BaketVersion (onDelete: Cascade from baket)
    const deletedVersions = await tx.baketVersion.deleteMany({
      where: { baketId: { in: baketIds } },
    });
    console.log(`  Deleted BaketVersion: ${deletedVersions.count}`);

    // Step 13: Delete Baket itself
    const deletedBakets = await tx.baket.deleteMany({
      where: { id: { in: baketIds } },
    });
    console.log(`  Deleted Baket: ${deletedBakets.count}`);
  });

  console.log('\n=== DELETION COMPLETE ===');

  // Verify
  const remainingBakets = await prisma.baket.count();
  console.log(`Remaining bakets in DB: ${remainingBakets}`);
}

main()
  .catch((e) => {
    console.error('ERROR:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
