import { randomUUID } from 'node:crypto';

import { WhatsAppMessageStatus } from '../generated/prisma/client.js';
import { prisma } from '../modules/prisma/prisma.service.js';

const CITY_CODES: Record<string, string> = {
  JAKARTA_PUSAT: 'PST',
  JAKARTA_UTARA: 'UTR',
  JAKARTA_BARAT: 'BRT',
  JAKARTA_SELATAN: 'SEL',
  JAKARTA_TIMUR: 'TMR',
  KEPULAUAN_SERIBU: 'KSR',
};

function cityCode(areaName?: string | null) {
  if (!areaName) return 'WLY';
  const normalized = areaName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return CITY_CODES[normalized] ?? normalized.slice(0, 3).padEnd(3, 'X');
}

function dateKey(date: Date) {
  const wib = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const yyyy = wib.getUTCFullYear();
  const mm = String(wib.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(wib.getUTCDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

async function main() {
  const channel = await prisma.integrationChannel.findUnique({
    where: { code: 'WA_CENTER_MAIN' },
    select: { id: true },
  });

  if (!channel) {
    console.error('IntegrationChannel WA_CENTER_MAIN tidak ditemukan. Jalankan seed master dahulu.');
    process.exit(1);
  }

  const versions = await prisma.baketVersion.findMany({
    where: { sourceMessages: { none: {} } },
    include: {
      baket: { include: { reportCategory: true } },
      eventArea: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Ditemukan ${versions.length} versi baket tanpa pesan sumber.`);

  let counter = 0;
  for (const version of versions) {
    counter += 1;
    const referenceNumber = `JKT-${cityCode(version.eventArea?.name)}-${dateKey(version.createdAt)}-${String(counter).padStart(6, '0')}`;

    const jaringId = version.baket.primaryJaringId;
    const jaring = jaringId
      ? await prisma.jaring.findUnique({
          where: { id: jaringId },
          select: { whatsappNumber: true },
        })
      : null;

    const message = await prisma.whatsAppMessage.create({
      data: {
        integrationChannelId: channel.id,
        externalMessageId: `backfill:${version.id}`,
        senderPhone: jaring?.whatsappNumber ?? '+6288800000000',
        jaringId: version.baket.primaryJaringId,
        categoryId: version.baket.reportCategoryId,
        content: version.originalContent,
        referenceNumber,
        latitude: version.latitude,
        longitude: version.longitude,
        receivedAt: version.createdAt,
        status: WhatsAppMessageStatus.RECEIVED,
        rawPayload: { backfilled: true },
      },
    });

    await prisma.baketVersionSourceMessage.create({
      data: {
        baketVersionId: version.id,
        messageId: message.id,
      },
    });

    console.log(`${referenceNumber} <- ${version.baketId.slice(0, 8)}`);
  }

  console.log(`Selesai: ${counter} referensi dibuat.`);
}

void main();
