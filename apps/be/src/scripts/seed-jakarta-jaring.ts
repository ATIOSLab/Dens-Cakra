import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import {
  CommandRouteType,
  FileLifecycleStatus,
  FileType,
  JaringRegistrationStatus,
  JaringStatus,
  RoleCode,
} from '../generated/prisma/client.js';
import { prisma } from '../modules/prisma/prisma.service.js';

const SEED_TAG = '[IMPORT_JAKARTA_JARING_2026]';
const MANIFEST_VERSION = 1;
const SOURCE_DATE = new Date('2026-06-09T17:00:00.000Z');
const STORAGE_PREFIX = 'jaring/jakarta-selatan/';

type ValidationIssue = {
  severity: 'ERROR' | 'WARNING';
  code: string;
  message: string;
};

type ManifestRecord = {
  index: number;
  code: string;
  aliasName: string;
  source: {
    key: string;
    tableIndex: number;
    rowIndex: number;
    number: string;
    districtHeading: string;
    levelLabel: string;
    profilingRaw: string;
    imagePaths: string[];
  };
  area: {
    cityOfficialCode: string;
    cityName: string;
    districtOfficialCode: string;
    districtName: string;
    villageOfficialCode: string;
    villageName: string;
    sourceLevel: 'CITY' | 'DISTRICT' | 'URBAN_VILLAGE' | 'RT_RW' | 'UNKNOWN';
  };
  profile: {
    fullName: string;
    whatsappNumber: string;
    usesPlaceholderWhatsappNumber: boolean;
    address: string | null;
    birthPlace: string | null;
    birthDate: string | null;
    gender: 'MALE' | 'FEMALE' | null;
    occupationRaw: string | null;
    occupationCode: string;
    jobTitle: string | null;
    organizationName: string | null;
    politicalAffiliation: string | null;
    nationalIdNumber: string | null;
    educationRaw: string | null;
    benefitRaw: string | null;
  };
  informationStage: 'ASSESSMENT' | 'DEVELOPMENT' | 'RECRUITMENT' | 'UNKNOWN';
  informationStageRaw: string;
  sourceValidationStatus: 'VALIDATED' | 'UNKNOWN';
  sourceValidationStatusRaw: string;
  profilePhoto: {
    storageKey: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    checksumSha256: string;
  };
  validationIssues: ValidationIssue[];
  importDisposition: 'APPROVED' | 'REVIEW_REQUIRED';
};

type JakartaJaringManifest = {
  version: number;
  generatedAt: string;
  sourceDocumentDate: string;
  source: {
    htmlFile: string;
    htmlSha256: string;
    docxFile: string;
    docxSha256: string;
  };
  summary: {
    declaredTotal: number;
    parsedTotal: number;
    approvedTotal: number;
    reviewRequiredTotal: number;
    districtTotal: number;
    expectedVillageTotal: number;
    coveredVillageTotal: number;
  };
  records: ManifestRecord[];
};

type ImportContext = {
  areasByCode: Map<
    string,
    { id: string; officialCode: string | null; name: string }
  >;
  assignmentsByDistrict: Map<string, string>;
  occupationsByCode: Map<string, string>;
};

function deterministicUuid(key: string) {
  const characters = createHash('sha256')
    .update(key)
    .digest('hex')
    .slice(0, 32)
    .split('');
  characters[12] = '4';
  characters[16] = (
    (Number.parseInt(characters[16] ?? '0', 16) & 0x3) |
    0x8
  ).toString(16);
  const value = characters.join('');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function text(value: unknown, maximumLength: number) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, maximumLength) : null;
}

function validateStorageKey(storageKey: string) {
  if (
    !storageKey.startsWith(STORAGE_PREFIX) ||
    storageKey.includes('..') ||
    storageKey.includes('\\') ||
    !/^[a-z0-9._/-]+$/.test(storageKey)
  ) {
    throw new Error(`Unsafe or non-normalized storage key: ${storageKey}`);
  }
}

function validateManifest(
  value: unknown,
): asserts value is JakartaJaringManifest {
  if (!value || typeof value !== 'object') {
    throw new Error('Jakarta Jaring manifest must be an object.');
  }
  const manifest = value as Partial<JakartaJaringManifest>;
  if (manifest.version !== MANIFEST_VERSION) {
    throw new Error(
      `Unsupported Jakarta Jaring manifest version: ${String(manifest.version)}`,
    );
  }
  if (!Array.isArray(manifest.records) || manifest.records.length === 0) {
    throw new Error('Jakarta Jaring manifest has no records.');
  }
  if (manifest.summary?.parsedTotal !== manifest.records.length) {
    throw new Error('Manifest summary parsedTotal does not match records.');
  }

  const codes = new Set<string>();
  const aliases = new Set<string>();
  const storageKeys = new Set<string>();
  for (const [offset, record] of manifest.records.entries()) {
    if (record.index !== offset + 1) {
      throw new Error(`Manifest index is not contiguous at offset ${offset}.`);
    }
    if (!/^JKT-SEL-\d{4}$/.test(record.code) || codes.has(record.code)) {
      throw new Error(`Invalid or duplicate Jaring code: ${record.code}`);
    }
    if (!/^Z\d{5}$/.test(record.aliasName) || aliases.has(record.aliasName)) {
      throw new Error(`Invalid or duplicate Jaring alias: ${record.aliasName}`);
    }
    if (!/^\d+$/.test(record.profile.whatsappNumber)) {
      throw new Error(`Invalid normalized WhatsApp number at ${record.code}.`);
    }
    if (
      !/^31\.74\.\d{2}$/.test(record.area.districtOfficialCode) ||
      !/^31\.74\.\d{2}\.\d{4}$/.test(record.area.villageOfficialCode)
    ) {
      throw new Error(`Invalid administrative codes at ${record.code}.`);
    }
    validateStorageKey(record.profilePhoto.storageKey);
    if (storageKeys.has(record.profilePhoto.storageKey)) {
      throw new Error(
        `Duplicate storage key: ${record.profilePhoto.storageKey}`,
      );
    }
    codes.add(record.code);
    aliases.add(record.aliasName);
    storageKeys.add(record.profilePhoto.storageKey);
  }
}

async function readManifest(storageRoot: string) {
  const configured = process.env.JAKARTA_JARING_MANIFEST?.trim();
  const manifestPath = configured
    ? path.resolve(configured)
    : path.join(storageRoot, 'jaring', 'jakarta-selatan', 'manifest.json');
  const parsed: unknown = JSON.parse(await readFile(manifestPath, 'utf8'));
  validateManifest(parsed);
  return { manifest: parsed, manifestPath };
}

async function loadContext(
  manifest: JakartaJaringManifest,
): Promise<ImportContext> {
  const villageCodes = [
    ...new Set(
      manifest.records.map((record) => record.area.villageOfficialCode),
    ),
  ];
  const districtCodes = [
    ...new Set(
      manifest.records.map((record) => record.area.districtOfficialCode),
    ),
  ];
  const occupationCodes = [
    ...new Set(manifest.records.map((record) => record.profile.occupationCode)),
  ];
  const [areas, occupations] = await Promise.all([
    prisma.administrativeArea.findMany({
      where: {
        officialCode: { in: villageCodes },
        level: { in: ['VILLAGE', 'URBAN_VILLAGE'] },
        isActive: true,
        deletedAt: null,
      },
      select: { id: true, officialCode: true, name: true },
    }),
    prisma.jaringOccupation.findMany({
      where: { code: { in: occupationCodes }, isActive: true },
      select: { id: true, code: true },
    }),
  ]);
  const areasByCode = new Map<
    string,
    { id: string; officialCode: string | null; name: string }
  >();
  for (const area of areas) {
    if (area.officialCode) {
      areasByCode.set(area.officialCode, area);
    }
  }
  const occupationsByCode = new Map(
    occupations.map((occupation) => [occupation.code, occupation.id]),
  );
  const missingAreas = villageCodes.filter((code) => !areasByCode.has(code));
  const missingOccupations = occupationCodes.filter(
    (code) => !occupationsByCode.has(code),
  );
  if (missingAreas.length > 0) {
    throw new Error(`Missing active villages: ${missingAreas.join(', ')}`);
  }
  if (missingOccupations.length > 0) {
    throw new Error(
      `Missing active Jaring occupations: ${missingOccupations.join(', ')}`,
    );
  }

  const assignmentsByDistrict = new Map<string, string>();
  for (const districtCode of districtCodes) {
    const assignments = await prisma.userOperationalAssignment.findMany({
      where: {
        isActive: true,
        validUntil: null,
        branch: CommandRouteType.BINDA,
        role: { code: RoleCode.FIELD_OFFICER, isActive: true },
        userProfile: { isActive: true, deletedAt: null },
        areaScopes: {
          some: {
            validUntil: null,
            area: {
              OR: [
                { officialCode: districtCode },
                { parent: { officialCode: districtCode } },
              ],
            },
          },
        },
      },
      select: { id: true },
      distinct: ['id'],
    });
    if (assignments.length !== 1) {
      throw new Error(
        `Kecamatan ${districtCode} harus terhubung ke tepat satu Petugas Wilayah (Gaswil) aktif; ditemukan ${assignments.length}.`,
      );
    }
    assignmentsByDistrict.set(districtCode, assignments[0].id);
  }
  return { areasByCode, assignmentsByDistrict, occupationsByCode };
}

async function validatePhoto(storageRoot: string, record: ManifestRecord) {
  const absolutePath = path.resolve(
    storageRoot,
    record.profilePhoto.storageKey,
  );
  const expectedRoot = `${path.resolve(storageRoot)}${path.sep}`;
  if (!absolutePath.startsWith(expectedRoot)) {
    throw new Error(
      `Photo escapes storage root: ${record.profilePhoto.storageKey}`,
    );
  }
  const [buffer, fileStat] = await Promise.all([
    readFile(absolutePath),
    stat(absolutePath),
  ]);
  const checksumSha256 = createHash('sha256').update(buffer).digest('hex');
  if (
    fileStat.size !== record.profilePhoto.sizeBytes ||
    checksumSha256 !== record.profilePhoto.checksumSha256
  ) {
    throw new Error(
      `Photo checksum/size mismatch: ${record.profilePhoto.storageKey}`,
    );
  }
  return { absolutePath, fileStat, checksumSha256 };
}

function importNotes(record: ManifestRecord) {
  const issues =
    record.validationIssues.length > 0
      ? record.validationIssues
          .map((issue) => `${issue.code}: ${issue.message}`)
          .join(' | ')
      : 'Tidak ada.';
  return [
    `${SEED_TAG} Data sumber jakarta.html.`,
    `Index/kunci sumber: ${record.index} / ${record.source.key}.`,
    `Tingkat sumber: ${record.source.levelLabel || '(kosong)'} (${record.area.sourceLevel}).`,
    `Wilayah normalisasi: ${record.area.villageName}, ${record.area.districtName}, ${record.area.cityName}.`,
    `Keterangan: ${record.informationStageRaw} -> ${record.informationStage}.`,
    `Status sumber: ${record.sourceValidationStatusRaw} -> ${record.sourceValidationStatus}.`,
    `Keputusan impor: ${record.importDisposition}.`,
    `Masalah validasi: ${issues}`,
    `Profil sumber: ${record.source.profilingRaw}`,
  ].join('\n');
}

async function importRecord(
  storageRoot: string,
  context: ImportContext,
  record: ManifestRecord,
) {
  const photo = await validatePhoto(storageRoot, record);
  const area = context.areasByCode.get(record.area.villageOfficialCode);
  const fieldOfficerAssignmentId = context.assignmentsByDistrict.get(
    record.area.districtOfficialCode,
  );
  const occupationId = context.occupationsByCode.get(
    record.profile.occupationCode,
  );
  if (!area || !fieldOfficerAssignmentId || !occupationId) {
    throw new Error(`Incomplete import context for ${record.code}.`);
  }

  const fileId = deterministicUuid(`${SEED_TAG}:file:${record.code}`);
  const jaringId = deterministicUuid(`${SEED_TAG}:jaring:${record.code}`);
  const caretakerId = deterministicUuid(`${SEED_TAG}:caretaker:${record.code}`);
  const coverageId = deterministicUuid(`${SEED_TAG}:coverage:${record.code}`);
  const approved = record.importDisposition === 'APPROVED';
  const registrationStatus = approved
    ? JaringRegistrationStatus.APPROVED
    : JaringRegistrationStatus.PENDING;
  const status = approved ? JaringStatus.ACTIVE : JaringStatus.INACTIVE;
  const nationalIdNumber =
    record.profile.nationalIdNumber?.match(/^\d{16}$/)?.[0] ?? null;

  await prisma.$transaction(async (tx) => {
    const fileAsset = await tx.fileAsset.upsert({
      where: { storageKey: record.profilePhoto.storageKey },
      update: {
        originalName: text(record.profilePhoto.originalName, 255),
        mimeType: record.profilePhoto.mimeType,
        fileType: FileType.PHOTO,
        sizeBytes: BigInt(photo.fileStat.size),
        checksumSha256: photo.checksumSha256,
        lifecycleStatus: FileLifecycleStatus.CLEAN,
        scanResult: {
          provider: 'trusted-document-import',
          verdict: 'clean',
          source: record.source.key,
        },
        scannedAt: new Date(),
        createdByAssignmentId: fieldOfficerAssignmentId,
        deletedAt: null,
      },
      create: {
        id: fileId,
        storageKey: record.profilePhoto.storageKey,
        originalName: text(record.profilePhoto.originalName, 255),
        mimeType: record.profilePhoto.mimeType,
        fileType: FileType.PHOTO,
        sizeBytes: BigInt(photo.fileStat.size),
        checksumSha256: photo.checksumSha256,
        lifecycleStatus: FileLifecycleStatus.CLEAN,
        scanResult: {
          provider: 'trusted-document-import',
          verdict: 'clean',
          source: record.source.key,
        },
        scannedAt: new Date(),
        createdByAssignmentId: fieldOfficerAssignmentId,
      },
    });
    await tx.jaring.upsert({
      where: { id: jaringId },
      update: {
        aliasName: record.aliasName,
        whatsappNumber: record.profile.whatsappNumber,
        fullName: text(record.profile.fullName, 180),
        nationalIdNumber,
        address: record.profile.address,
        birthPlace: text(record.profile.birthPlace, 120),
        birthDate: record.profile.birthDate
          ? new Date(`${record.profile.birthDate}T00:00:00.000Z`)
          : null,
        gender: record.profile.gender,
        occupationId,
        profilePhotoFileId: fileAsset.id,
        jobTitle: text(record.profile.jobTitle, 150),
        organizationName: text(record.profile.organizationName, 180),
        politicalAffiliation: text(record.profile.politicalAffiliation, 180),
        status,
        registrationStatus,
        rejectionReason: null,
        reviewedAt: approved ? SOURCE_DATE : null,
        reviewedByAssignmentId: null,
        createdByAssignmentId: fieldOfficerAssignmentId,
        notes: importNotes(record),
        registeredAt: SOURCE_DATE,
        deactivatedAt: approved ? null : SOURCE_DATE,
        deletedAt: null,
      },
      create: {
        id: jaringId,
        aliasName: record.aliasName,
        whatsappNumber: record.profile.whatsappNumber,
        fullName: text(record.profile.fullName, 180),
        nationalIdNumber,
        address: record.profile.address,
        birthPlace: text(record.profile.birthPlace, 120),
        birthDate: record.profile.birthDate
          ? new Date(`${record.profile.birthDate}T00:00:00.000Z`)
          : null,
        gender: record.profile.gender,
        occupationId,
        profilePhotoFileId: fileAsset.id,
        jobTitle: text(record.profile.jobTitle, 150),
        organizationName: text(record.profile.organizationName, 180),
        politicalAffiliation: text(record.profile.politicalAffiliation, 180),
        status,
        registrationStatus,
        rejectionReason: null,
        reviewedAt: approved ? SOURCE_DATE : null,
        reviewedByAssignmentId: null,
        createdByAssignmentId: fieldOfficerAssignmentId,
        notes: importNotes(record),
        registeredAt: SOURCE_DATE,
        deactivatedAt: approved ? null : SOURCE_DATE,
      },
    });
    await tx.jaringCaretakerAssignment.upsert({
      where: { id: caretakerId },
      update: {
        jaringId,
        fieldOfficerAssignmentId,
        isActive: true,
        validFrom: SOURCE_DATE,
        validUntil: null,
        transferReason: null,
      },
      create: {
        id: caretakerId,
        jaringId,
        fieldOfficerAssignmentId,
        isActive: true,
        validFrom: SOURCE_DATE,
      },
    });
    await tx.jaringAreaCoverage.upsert({
      where: { id: coverageId },
      update: {
        jaringId,
        areaId: area.id,
        isPrimary: true,
        validFrom: SOURCE_DATE,
        validUntil: null,
      },
      create: {
        id: coverageId,
        jaringId,
        areaId: area.id,
        isPrimary: true,
        validFrom: SOURCE_DATE,
      },
    });
  });
}

async function seedJakartaJaring() {
  const storageRoot = path.resolve(
    process.env.LOCAL_STORAGE_ROOT || path.join(process.cwd(), 'storage'),
  );
  const { manifest, manifestPath } = await readManifest(storageRoot);
  const context = await loadContext(manifest);
  const dryRun = process.argv.includes('--dry-run');

  for (const record of manifest.records) {
    await validatePhoto(storageRoot, record);
  }
  if (dryRun) {
    console.info(
      JSON.stringify(
        {
          mode: 'dry-run',
          manifestPath,
          ...manifest.summary,
          photosValidated: manifest.records.length,
          areasValidated: context.areasByCode.size,
          fieldOfficersValidated: context.assignmentsByDistrict.size,
          occupationsValidated: context.occupationsByCode.size,
        },
        null,
        2,
      ),
    );
    return;
  }

  let imported = 0;
  for (const record of manifest.records) {
    await importRecord(storageRoot, context, record);
    imported += 1;
    if (imported % 25 === 0 || imported === manifest.records.length) {
      console.info(
        `${SEED_TAG} imported ${imported}/${manifest.records.length}`,
      );
    }
  }
  const importedJaringIds = manifest.records.map((record) =>
    deterministicUuid(`${SEED_TAG}:jaring:${record.code}`),
  );
  const [jaringTotal, activeTotal, pendingTotal, coverageTotal, photoTotal] =
    await Promise.all([
      prisma.jaring.count({
        where: { id: { in: importedJaringIds }, deletedAt: null },
      }),
      prisma.jaring.count({
        where: {
          id: { in: importedJaringIds },
          status: JaringStatus.ACTIVE,
          registrationStatus: JaringRegistrationStatus.APPROVED,
          deletedAt: null,
        },
      }),
      prisma.jaring.count({
        where: {
          id: { in: importedJaringIds },
          registrationStatus: JaringRegistrationStatus.PENDING,
          deletedAt: null,
        },
      }),
      prisma.jaringAreaCoverage.count({
        where: {
          jaring: { id: { in: importedJaringIds }, deletedAt: null },
        },
      }),
      prisma.fileAsset.count({
        where: {
          storageKey: { startsWith: STORAGE_PREFIX },
          deletedAt: null,
        },
      }),
    ]);
  console.info(
    JSON.stringify(
      {
        imported,
        jaringTotal,
        activeTotal,
        pendingTotal,
        coverageTotal,
        photoTotal,
      },
      null,
      2,
    ),
  );
}

seedJakartaJaring()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
