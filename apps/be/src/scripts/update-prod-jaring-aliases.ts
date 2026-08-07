import { crc32 } from 'node:zlib';
import { prisma } from '../modules/prisma/prisma.service.js';

export function computeCrc32Alias(
  areaCode: string,
  gender: string | null | undefined,
  sequence: number,
): string {
  const areaHash = crc32(areaCode.trim()).toString(16).toUpperCase().padStart(8, '0');
  const genderCode = gender === 'FEMALE' ? '08' : '01';
  const sequenceStr = String(sequence).padStart(4, '0');
  return `${areaHash}${genderCode}${sequenceStr}`;
}

async function updateProductionJaringAliases() {
  console.log('--- Starting Production Jaring Alias Migration (CRC32 + Gender + Sequence) ---');

  const jarings = await prisma.jaring.findMany({
    select: {
      id: true,
      aliasName: true,
      fullName: true,
      gender: true,
      createdAt: true,
      areaCoverages: {
        select: {
          area: {
            select: {
              id: true,
              code: true,
              officialCode: true,
              name: true,
              level: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Fetched ${jarings.length} Jaring records from database.`);

  const sequenceByArea = new Map<string, number>();
  const usedAliases = new Set<string>();
  const updates: Array<{ id: string; oldAlias: string | null; newAlias: string; areaCode: string; sequence: number }> = [];

  for (const jaring of jarings) {
    const primaryArea = jaring.areaCoverages[0]?.area;
    const areaCode = primaryArea?.officialCode?.trim() || primaryArea?.code?.trim() || '31';

    const currentSeq = (sequenceByArea.get(areaCode) || 0) + 1;
    sequenceByArea.set(areaCode, currentSeq);

    let sequenceToUse = currentSeq;
    let aliasHash = computeCrc32Alias(areaCode, jaring.gender, sequenceToUse);

    while (usedAliases.has(aliasHash)) {
      sequenceToUse++;
      aliasHash = computeCrc32Alias(areaCode, jaring.gender, sequenceToUse);
    }
    usedAliases.add(aliasHash);

    updates.push({
      id: jaring.id,
      oldAlias: jaring.aliasName,
      newAlias: aliasHash,
      areaCode,
      sequence: sequenceToUse,
    });
  }

  console.log(`Prepared ${updates.length} updates. Executing database updates...`);

  // Execute database updates in chunks of 25
  const CHUNK_SIZE = 25;
  for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
    const chunk = updates.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map((item) =>
        prisma.jaring.update({
          where: { id: item.id },
          data: { aliasName: item.newAlias },
        })
      )
    );
    console.log(`Updated ${Math.min(i + CHUNK_SIZE, updates.length)}/${updates.length} items...`);
  }

  console.log('✅ Production Jaring aliases successfully updated to CRC32 hashes!');

  // Verification check
  const sampleVerification = await prisma.jaring.findMany({
    take: 10,
    select: { id: true, aliasName: true, fullName: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log('Sample updated jarings (first 10):');
  console.table(sampleVerification);
}

updateProductionJaringAliases()
  .catch((err) => {
    console.error('❌ Error updating production jaring aliases:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
