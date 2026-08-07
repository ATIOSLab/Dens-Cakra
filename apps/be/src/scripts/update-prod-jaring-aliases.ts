import { AdministrativeLevel } from '../generated/prisma/client.js';
import { prisma } from '../modules/prisma/prisma.service.js';

const JAKARTA_CITY_ALIAS_CODES: Record<string, string> = {
  '31.74': 'Z', // Jakarta Selatan
  '31.73': 'Y', // Jakarta Barat
  '31.75': 'X', // Jakarta Timur
  '31.71': 'W', // Jakarta Pusat
  '31.72': 'V', // Jakarta Utara
  '31.01': 'V', // Kepulauan Seribu
};

type AdministrativeCodeArea = {
  code: string;
  officialCode: string | null;
};

function administrativeCode(area: AdministrativeCodeArea) {
  return area.officialCode?.trim() || area.code.trim();
}

function aliasPrefixForDistrict(area: AdministrativeCodeArea) {
  const districtCode = administrativeCode(area);
  const cityCode = districtCode.split('.').slice(0, -1).join('.');
  const cityAlias = JAKARTA_CITY_ALIAS_CODES[cityCode];
  const districtNumber = (districtCode.split('.').at(-1) ?? '')
    .replace(/\D/g, '')
    .padStart(2, '0');

  return cityAlias ? `${cityAlias}${districtNumber}` : null;
}

async function updateProductionJaringAliases() {
  const shouldApply = process.argv.includes('--apply');
  const jarings = await prisma.jaring.findMany({
    select: {
      id: true,
      aliasName: true,
      createdAt: true,
      areaCoverages: {
        orderBy: [{ isPrimary: 'desc' }, { validFrom: 'desc' }],
        take: 1,
        select: {
          area: {
            select: {
              code: true,
              officialCode: true,
              level: true,
              parent: {
                select: {
                  code: true,
                  officialCode: true,
                  level: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

  const sequenceByPrefix = new Map<string, number>();
  const updates = jarings.map((jaring) => {
    const coverageArea = jaring.areaCoverages[0]?.area;
    const district =
      coverageArea?.level === AdministrativeLevel.DISTRICT
        ? coverageArea
        : coverageArea?.parent?.level === AdministrativeLevel.DISTRICT
          ? coverageArea.parent
          : null;
    const prefix = district ? aliasPrefixForDistrict(district) : null;

    if (!prefix) {
      throw new Error(
        `Jaring ${jaring.id} tidak memiliki kecamatan Jakarta yang didukung.`,
      );
    }

    const sequence = (sequenceByPrefix.get(prefix) ?? 0) + 1;
    if (sequence > 999) {
      throw new Error(`Urutan alias ${prefix} sudah melebihi batas 999.`);
    }
    sequenceByPrefix.set(prefix, sequence);

    return {
      id: jaring.id,
      oldAlias: jaring.aliasName,
      newAlias: `${prefix}${String(sequence).padStart(3, '0')}`,
    };
  });

  const aliases = new Set(updates.map((item) => item.newAlias));
  if (aliases.size !== updates.length) {
    throw new Error('Pemetaan alias menghasilkan kode duplikat.');
  }

  console.log(
    `${shouldApply ? 'Menerapkan' : 'Simulasi'} ${updates.length} alias Jaring ke pola V/W/X/Y/Z.`,
  );
  console.table(updates.slice(0, 10));

  if (!shouldApply) {
    console.log(
      'Jalankan kembali dengan --apply setelah backup untuk menerapkan perubahan.',
    );
    return;
  }

  await prisma.$transaction(
    updates.map((item) =>
      prisma.jaring.update({
        where: { id: item.id },
        data: { aliasName: item.newAlias },
      }),
    ),
  );
  console.log(`Berhasil memperbarui ${updates.length} alias Jaring.`);
}

updateProductionJaringAliases()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
