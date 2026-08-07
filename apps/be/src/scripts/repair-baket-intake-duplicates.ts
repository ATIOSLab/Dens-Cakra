import {
  BaketStatus,
  PriorityLevel,
  WhatsAppMessageStatus,
} from '../generated/prisma/client.js';
import { prisma } from '../modules/prisma/prisma.service.js';

const TARGET_MESSAGE_ID = '1df0d69c-ec7b-4c3c-8bf0-22974680be52';
const execute = process.argv.includes('--execute');

async function main() {
  const message = await prisma.whatsAppMessage.findUnique({
    where: { id: TARGET_MESSAGE_ID },
    include: {
      baketLinks: {
        include: {
          baketVersion: {
            include: {
              attachments: true,
              verification: true,
              baket: {
                include: {
                  revisionRequests: true,
                  alerts: true,
                  versions: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!message) {
    throw new Error(`Pesan target ${TARGET_MESSAGE_ID} tidak ditemukan.`);
  }

  const bakets = new Map(
    message.baketLinks.map((link) => [
      link.baketVersion.baket.id,
      link.baketVersion.baket,
    ]),
  );
  const unsafe = [...bakets.values()].filter((baket) => {
    const initialVersion = baket.versions[0];
    const onlyInitialVersion =
      baket.versions.length === 1 &&
      initialVersion?.versionNumber === 1 &&
      !initialVersion.revisionReason &&
      !initialVersion.fieldOfficerNote &&
      initialVersion.originalContent === (message.content ?? '') &&
      initialVersion.normalizedContent === null &&
      initialVersion.urgency === PriorityLevel.NORMAL &&
      Number(initialVersion.latitude) === Number(message.latitude) &&
      Number(initialVersion.longitude) === Number(message.longitude);
    return (
      baket.status !== BaketStatus.DRAFT ||
      !onlyInitialVersion ||
      baket.revisionRequests.length > 0 ||
      baket.alerts.length > 0 ||
      message.baketLinks.some(
        (link) =>
          link.baketVersion.baketId === baket.id &&
          (link.baketVersion.attachments.length > 0 ||
            link.baketVersion.verification !== null),
      )
    );
  });

  const report = {
    mode: execute ? 'execute' : 'dry-run',
    messageId: message.id,
    messageStatus: message.status,
    currentCategoryId: message.categoryId,
    linkedBaketCount: bakets.size,
    unsafeBaketIds: unsafe.map((baket) => baket.id),
    plannedMessageStatus: WhatsAppMessageStatus.READY_FOR_BAKET,
  };
  console.log(JSON.stringify(report, null, 2));

  if (unsafe.length > 0) {
    throw new Error(
      'Repair dihentikan: ditemukan Baket yang sudah diedit, dikirim, atau mempunyai relasi lanjutan.',
    );
  }
  if (!execute) {
    console.log(
      'Dry-run selesai. Jalankan ulang dengan --execute untuk menerapkan.',
    );
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.whatsAppMessage.update({
      where: { id: TARGET_MESSAGE_ID },
      data: { convertedBaketId: null },
    });
    if (bakets.size > 0) {
      await tx.baket.deleteMany({
        where: { id: { in: [...bakets.keys()] }, status: BaketStatus.DRAFT },
      });
    }
    await tx.whatsAppMessage.update({
      where: { id: TARGET_MESSAGE_ID },
      data: {
        status: WhatsAppMessageStatus.READY_FOR_BAKET,
        categoryId: null,
        processedAt: null,
        convertedBaketId: null,
      },
    });
  });

  console.log(
    `Repair selesai: ${bakets.size} Baket draft dihapus dan pesan dikembalikan ke READY_FOR_BAKET.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
