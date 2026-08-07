import { OrganizationType, PositionCode } from '../common/constants/legacy-operational-code.js';
import {
  createHash } from 'node:crypto';
import { readFile,
  readdir,
  stat } from 'node:fs/promises';
import path from 'node:path';
import {
  AnalysisStatus,
  ApprovalDecision,
  ApprovalEventType,
  ApprovalStage,
  ApprovalStepStatus,
  ApprovalWorkflowStatus,
  AreaResolutionMethod,
  BaketStatus,
  Classification,
  CommandRouteType,
  CoordinateSource,
  CoverageScopeType,
  CoverageValidationStatus,
  DistributionStatus,
  FileLifecycleStatus,
  FileType,
  InformationCredibility,
  IntelEntityType,
  JaringStatus,
  NotificationType,
  Prisma,
  PriorityLevel,
  ProductStatus,
  RevisionRequestStatus,
  SourceReliability,
  TaskAssignmentStatus,
  TaskStatus,
  VerificationCheckStatus,
  VerificationStatus,
} from '../generated/prisma/client.js';
import { prisma } from '../modules/prisma/prisma.service.js';

const SEED_TAG = '[SEED_JAKARTA_DEMO]';
const JAKARTA_PROVINCE_CODE = '31';
const DEMO_YEAR = 2026;
const seedBaseDate = new Date('2026-07-07T01:00:00.000Z');

const assignmentSelect = {
  id: true,
  seatId: true,
  positionId: true,
  userProfileId: true,
  userProfile: { select: { fullName: true } },
  position: {
    select: {
      id: true,
      title: true,
      code: true,
      reportsToPositionId: true,
      organizationUnitId: true,
      organizationUnit: { select: { id: true, code: true, name: true } },
    },
  },
} satisfies Prisma.UserSeatAssignmentSelect;

type Assignment = Prisma.UserSeatAssignmentGetPayload<{
  select: typeof assignmentSelect;
}>;

type DemoArea = {
  id: string;
  officialCode: string;
  name: string;
  centroidLatitude: number;
  centroidLongitude: number;
  coordinator: Assignment;
  fieldOfficer: Assignment;
};

type DemoFile = {
  id: string;
  storageKey: string;
};

type DemoBaket = {
  id: string;
  versionId: string;
  verificationId: string | null;
  title: string;
  originalContent: string;
  area: DemoArea;
};

type DemoAnalysis = {
  caseId: string;
  versionId: string;
  title: string;
  status: AnalysisStatus;
  sourceBakets: DemoBaket[];
};

const baketStatuses = [
  BaketStatus.DRAFT,
  BaketStatus.READY_TO_SEND,
  BaketStatus.SENT_TO_OIM,
  BaketStatus.UNDER_VERIFICATION,
  BaketStatus.NEEDS_DEVELOPMENT,
  BaketStatus.VERIFIED,
  BaketStatus.VERIFIED,
  BaketStatus.VERIFIED,
] as const;

const reportTopics = [
  {
    title: 'Perkembangan konsolidasi massa di pusat pemerintahan',
    fact: 'Terpantau peningkatan komunikasi antar-komunitas menjelang penyampaian aspirasi di kawasan pusat pemerintahan.',
    implication:
      'Konsentrasi peserta dapat memengaruhi arus lalu lintas dan memerlukan pengaturan pengamanan terbuka.',
  },
  {
    title: 'Dinamika harga dan distribusi bahan pokok',
    fact: 'Pedagang melaporkan perubahan jadwal pasokan dan kenaikan permintaan pada beberapa pasar induk Jakarta.',
    implication:
      'Gangguan distribusi jangka pendek berpotensi memicu kenaikan harga pada tingkat pengecer.',
  },
  {
    title: 'Aktivitas tidak biasa di simpul transportasi',
    fact: 'Teridentifikasi peningkatan kedatangan kelompok dari luar wilayah pada jam di luar pola normal.',
    implication:
      'Diperlukan konfirmasi tujuan pergerakan serta koordinasi dengan pengelola simpul transportasi.',
  },
  {
    title: 'Sebaran narasi provokatif pada media sosial lokal',
    fact: 'Sejumlah akun komunitas menyebarkan narasi yang belum terverifikasi dan mulai memperoleh interaksi tinggi.',
    implication:
      'Narasi berpotensi membentuk persepsi negatif apabila tidak diimbangi klarifikasi berbasis fakta.',
  },
  {
    title: 'Kerawanan genangan pada kawasan permukiman padat',
    fact: 'Curah hujan dan hambatan aliran drainase meningkatkan genangan pada beberapa akses permukiman.',
    implication:
      'Mobilitas warga dan distribusi bantuan dapat terganggu apabila intensitas hujan bertahan.',
  },
  {
    title: 'Perkembangan aktivitas pada objek vital',
    fact: 'Aktivitas operasional objek vital meningkat bersamaan dengan bertambahnya kendaraan logistik dan pekerja kontrak.',
    implication:
      'Pemeriksaan akses dan pengawasan perimeter perlu ditingkatkan pada jam pergantian kerja.',
  },
  {
    title: 'Dinamika komunitas terkait pelayanan publik',
    fact: 'Keluhan pelayanan publik berkembang dari diskusi terbatas menjadi agenda pertemuan warga lintas kelurahan.',
    implication:
      'Respons cepat pemangku kepentingan dapat mencegah perluasan isu dan akumulasi ketidakpuasan.',
  },
  {
    title: 'Indikasi pelanggaran distribusi komoditas strategis',
    fact: 'Ditemukan perbedaan antara catatan pengiriman dan ketersediaan komoditas pada titik distribusi akhir.',
    implication:
      'Pemeriksaan rantai pasok diperlukan untuk memastikan tidak terjadi penimbunan atau pengalihan distribusi.',
  },
] as const;

const verificationChecks = [
  ['SOURCE_IDENTITY', 'Identitas sumber'],
  ['TITLE_COMPLETENESS', 'Kelengkapan judul'],
  ['PHOTO_VALIDITY', 'Validitas foto'],
  ['GPS_VALIDITY', 'Validitas GPS'],
  ['CONTENT_COMPLETENESS', 'Kelengkapan isi'],
  ['TASK_RELEVANCE', 'Relevansi penugasan'],
  ['UUK_RELEVANCE', 'Relevansi UUK'],
  ['DUPLICATE_CHECK', 'Pemeriksaan duplikasi'],
  ['TIME_CONSISTENCY', 'Konsistensi waktu'],
  ['LOCATION_CONSISTENCY', 'Konsistensi lokasi'],
  ['CROSS_REFERENCE', 'Referensi silang'],
] as const;

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

function addHours(base: Date, hours: number) {
  return new Date(base.getTime() + hours * 60 * 60 * 1000);
}

function compactCode(value: string) {
  return value.replace(/[^A-Z0-9]+/gi, '').toUpperCase();
}

function trimAreaName(value: string) {
  return value
    .trim()
    .replace(/^Kota Administrasi /, '')
    .replace(/^Kabupaten Administrasi /, '');
}

function fallbackCoordinates(code: string) {
  const coordinates: Record<string, [number, number]> = {
    '31.01': [-5.612, 106.616],
    '31.71': [-6.186, 106.834],
    '31.72': [-6.138, 106.863],
    '31.73': [-6.168, 106.758],
    '31.74': [-6.262, 106.81],
    '31.75': [-6.225, 106.9],
  };
  return coordinates[code] ?? [-6.2088, 106.8456];
}

async function listPhotoFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(root, entry.name);
      if (entry.isDirectory()) return listPhotoFiles(absolutePath);
      return /\.(jpe?g|png|webp)$/i.test(entry.name) ? [absolutePath] : [];
    }),
  );
  return nested.flat();
}

async function registerStoragePhotos(createdByAssignmentId: string) {
  const storageRoot = path.resolve(
    process.env.LOCAL_STORAGE_ROOT || path.join(process.cwd(), 'storage'),
  );
  const photoPaths = (await listPhotoFiles(storageRoot)).sort();
  if (photoPaths.length === 0) {
    throw new Error(`No photo assets found under ${storageRoot}.`);
  }

  const files: DemoFile[] = [];
  for (const absolutePath of photoPaths) {
    const [buffer, fileStat] = await Promise.all([
      readFile(absolutePath),
      stat(absolutePath),
    ]);
    const storageKey = path
      .relative(storageRoot, absolutePath)
      .replace(/\\/g, '/');
    const mimeType = absolutePath.toLowerCase().endsWith('.png')
      ? 'image/png'
      : absolutePath.toLowerCase().endsWith('.webp')
        ? 'image/webp'
        : 'image/jpeg';
    const fileId = deterministicUuid(`jakarta-demo:file:${storageKey}`);
    const file = await prisma.fileAsset.upsert({
      where: { storageKey },
      update: {
        originalName: path.basename(absolutePath),
        mimeType,
        fileType: FileType.PHOTO,
        sizeBytes: BigInt(fileStat.size),
        checksumSha256: createHash('sha256').update(buffer).digest('hex'),
        lifecycleStatus: FileLifecycleStatus.CLEAN,
        scanResult: { provider: 'demo-seed', verdict: 'clean' },
        scannedAt: new Date(),
        createdByAssignmentId,
        deletedAt: null,
      },
      create: {
        id: fileId,
        storageKey,
        originalName: path.basename(absolutePath),
        mimeType,
        fileType: FileType.PHOTO,
        sizeBytes: BigInt(fileStat.size),
        checksumSha256: createHash('sha256').update(buffer).digest('hex'),
        lifecycleStatus: FileLifecycleStatus.CLEAN,
        scanResult: { provider: 'demo-seed', verdict: 'clean' },
        scannedAt: new Date(),
        createdByAssignmentId,
      },
      select: { id: true, storageKey: true },
    });
    files.push(file);
  }
  return files;
}

async function loadContext() {
  const province = await prisma.administrativeArea.findFirstOrThrow({
    where: {
      officialCode: JAKARTA_PROVINCE_CODE,
      isActive: true,
      deletedAt: null,
    },
  });
  const rawAreas = await prisma.administrativeArea.findMany({
    where: {
      parentId: province.id,
      officialCode: { startsWith: `${JAKARTA_PROVINCE_CODE}.` },
      level: { in: ['REGENCY', 'CITY'] },
      isActive: true,
      deletedAt: null,
    },
    orderBy: { officialCode: 'asc' },
  });
  if (rawAreas.length !== 6) {
    throw new Error(
      `Expected 6 Jakarta regency/city areas, found ${rawAreas.length}.`,
    );
  }

  const findAssignment = (positionCode: PositionCode, areaCode?: string) =>
    prisma.userSeatAssignment.findFirstOrThrow({
      where: {
        isPrimary: true,
        isActive: true,
        validUntil: null,
        userProfile: { isActive: true, deletedAt: null },
        position: {
          code: positionCode,
          isActive: true,
          ...(positionCode === PositionCode.DEPUTI_II
            ? {}
            : { branch: CommandRouteType.BINDA }),
        },
        ...(areaCode
          ? {
              areaScopes: {
                some: {
                  validUntil: null,
                  area: { officialCode: areaCode },
                },
              },
            }
          : {}),
      },
      select: assignmentSelect,
    });

  const [operationalManager, regionalCommander, executive] = await Promise.all([
    findAssignment(PositionCode.KABAGOPS, JAKARTA_PROVINCE_CODE),
    findAssignment(PositionCode.KABINDA, JAKARTA_PROVINCE_CODE),
    findAssignment(PositionCode.DEPUTI_II),
  ]);

  const areas: DemoArea[] = [];
  for (const rawArea of rawAreas) {
    const officialCode = rawArea.officialCode;
    if (!officialCode) continue;
    const coordinator = await findAssignment(PositionCode.KORWIL, officialCode);
    const districtCodes = (
      await prisma.administrativeArea.findMany({
        where: {
          parentId: rawArea.id,
          level: 'DISTRICT',
          isActive: true,
          deletedAt: null,
          officialCode: { not: null },
        },
        orderBy: { officialCode: 'asc' },
        select: { officialCode: true },
      })
    ).flatMap((district) =>
      district.officialCode ? [district.officialCode] : [],
    );
    const fieldOfficerAreaCodes =
      districtCodes.length > 0 ? districtCodes : [officialCode];
    const fieldOfficer = await prisma.userSeatAssignment.findFirstOrThrow({
      where: {
        isPrimary: true,
        isActive: true,
        validUntil: null,
        position: {
          code: PositionCode.PETUGAS_ORGANIK,
          branch: CommandRouteType.BINDA,
          reportsToPositionId: coordinator.positionId,
          isActive: true,
        },
        areaScopes: {
          some: {
            validUntil: null,
            area: { officialCode: { in: fieldOfficerAreaCodes } },
          },
        },
      },
      orderBy: { validFrom: 'asc' },
      select: assignmentSelect,
    });
    const fallback = fallbackCoordinates(officialCode);
    areas.push({
      id: rawArea.id,
      officialCode,
      name: rawArea.name.trim(),
      centroidLatitude: rawArea.centroidLatitude
        ? Number(rawArea.centroidLatitude)
        : fallback[0],
      centroidLongitude: rawArea.centroidLongitude
        ? Number(rawArea.centroidLongitude)
        : fallback[1],
      coordinator,
      fieldOfficer,
    });
  }

  const [categories, productTypes] = await Promise.all([
    prisma.reportCategory.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    }),
    prisma.productTypeDefinition.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
      include: {
        templates: {
          where: { isActive: true },
          orderBy: { versionNumber: 'desc' },
          take: 1,
          include: {
            sections: {
              orderBy: { orderNumber: 'asc' },
              include: { fields: { orderBy: { orderNumber: 'asc' } } },
            },
          },
        },
      },
    }),
  ]);
  if (
    categories.length === 0 ||
    productTypes.length === 0
  ) {
    throw new Error(
      'Master data is incomplete. Run npm run seed:all before this demo seed.',
    );
  }

  return {
    province,
    areas,
    operationalManager,
    regionalCommander,
    executive,
    categories,
    productTypes,
  };
}

async function seedAreaTask(area: DemoArea, operationalManager: Assignment) {
  const key = area.officialCode;
  const taskId = deterministicUuid(`jakarta-demo:task:${key}`);
  const assignmentId = deterministicUuid(`jakarta-demo:task-assignment:${key}`);
  const eventTime = addHours(
    seedBaseDate,
    area.officialCode.endsWith('01') ? 0 : Number(key.slice(-2)),
  );

  await prisma.task.upsert({
    where: { id: taskId },
    update: {
      ownerUnitId: operationalManager.position.organizationUnitId,
      createdByAssignmentId: operationalManager.id,
      title: `Pemantauan situasi strategis ${trimAreaName(area.name)}`,
      description: `${SEED_TAG} Himpun perkembangan politik, ekonomi, sosial, keamanan, dan infrastruktur sebagai bahan analisis DKI Jakarta.`,
      priority: PriorityLevel.HIGH,
      dueDate: addHours(eventTime, 168),
      status: TaskStatus.COMPLETED,
      deletedAt: null,
    },
    create: {
      id: taskId,
      ownerUnitId: operationalManager.position.organizationUnitId,
      createdByAssignmentId: operationalManager.id,
      title: `Pemantauan situasi strategis ${trimAreaName(area.name)}`,
      description: `${SEED_TAG} Himpun perkembangan politik, ekonomi, sosial, keamanan, dan infrastruktur sebagai bahan analisis DKI Jakarta.`,
      priority: PriorityLevel.HIGH,
      dueDate: addHours(eventTime, 168),
      status: TaskStatus.COMPLETED,
      createdAt: eventTime,
    },
  });
  await prisma.taskTargetArea.upsert({
    where: { taskId_areaId: { taskId, areaId: area.id } },
    update: { isPrimary: true },
    create: { taskId, areaId: area.id, isPrimary: true },
  });
  await prisma.taskAssignment.upsert({
    where: { id: assignmentId },
    update: {
      taskId,
      assignerAssignmentId: area.coordinator.id,
      assigneeAssignmentId: area.fieldOfficer.id,
      status: TaskAssignmentStatus.COMPLETED,
      readAt: addHours(eventTime, 1),
      acknowledgedAt: addHours(eventTime, 2),
      startedAt: addHours(eventTime, 3),
      completedAt: addHours(eventTime, 120),
      dueDate: addHours(eventTime, 168),
      assignmentNote: `${SEED_TAG} Prioritaskan fakta lapangan dengan foto dan koordinat.`,
    },
    create: {
      id: assignmentId,
      taskId,
      assignerAssignmentId: area.coordinator.id,
      assigneeAssignmentId: area.fieldOfficer.id,
      status: TaskAssignmentStatus.COMPLETED,
      assignedAt: eventTime,
      readAt: addHours(eventTime, 1),
      acknowledgedAt: addHours(eventTime, 2),
      startedAt: addHours(eventTime, 3),
      completedAt: addHours(eventTime, 120),
      dueDate: addHours(eventTime, 168),
      assignmentNote: `${SEED_TAG} Prioritaskan fakta lapangan dengan foto dan koordinat.`,
    },
  });
  for (const [index, progress] of [25, 60, 100].entries()) {
    const status =
      progress === 100
        ? TaskAssignmentStatus.COMPLETED
        : TaskAssignmentStatus.IN_PROGRESS;
    await prisma.taskProgressLog.upsert({
      where: {
        id: deterministicUuid(`jakarta-demo:progress:${key}:${progress}`),
      },
      update: {
        taskAssignmentId: assignmentId,
        status,
        progressPercent: progress,
        note: `${SEED_TAG} Progres penghimpunan bahan ${progress} persen.`,
        createdByAssignmentId: area.fieldOfficer.id,
      },
      create: {
        id: deterministicUuid(`jakarta-demo:progress:${key}:${progress}`),
        taskAssignmentId: assignmentId,
        status,
        progressPercent: progress,
        note: `${SEED_TAG} Progres penghimpunan bahan ${progress} persen.`,
        createdByAssignmentId: area.fieldOfficer.id,
        createdAt: addHours(eventTime, 24 + index * 36),
      },
    });
  }
  return assignmentId;
}

async function seedAreaJaring(area: DemoArea) {
  const jaringIds: string[] = [];
  for (let index = 0; index < 2; index += 1) {
    const key = `${area.officialCode}:${index + 1}`;
    const jaringId = deterministicUuid(`jakarta-demo:jaring:${key}`);
    const validFrom = addHours(seedBaseDate, -720 + index);
    await prisma.jaring.upsert({
      where: { id: jaringId },
      update: {
        aliasName: `Jaring ${trimAreaName(area.name)} ${index + 1}`,
        whatsappNumber: `+62888${compactCode(area.officialCode).padEnd(4, '0')}${String(index + 1).padStart(4, '0')}`,
        status: JaringStatus.ACTIVE,
        createdByAssignmentId: area.fieldOfficer.id,
        notes: `${SEED_TAG} Sumber aktif untuk kebutuhan presentasi wilayah DKI Jakarta.`,
        deactivatedAt: null,
        deletedAt: null,
      },
      create: {
        id: jaringId,
        aliasName: `Jaring ${trimAreaName(area.name)} ${index + 1}`,
        whatsappNumber: `+62888${compactCode(area.officialCode).padEnd(4, '0')}${String(index + 1).padStart(4, '0')}`,
        status: JaringStatus.ACTIVE,
        createdByAssignmentId: area.fieldOfficer.id,
        notes: `${SEED_TAG} Sumber aktif untuk kebutuhan presentasi wilayah DKI Jakarta.`,
        registeredAt: validFrom,
      },
    });
    await prisma.jaringCaretakerAssignment.upsert({
      where: { id: deterministicUuid(`jakarta-demo:caretaker:${key}`) },
      update: {
        jaringId,
        fieldOfficerAssignmentId: area.fieldOfficer.id,
        isActive: true,
        validUntil: null,
      },
      create: {
        id: deterministicUuid(`jakarta-demo:caretaker:${key}`),
        jaringId,
        fieldOfficerAssignmentId: area.fieldOfficer.id,
        isActive: true,
        validFrom,
      },
    });
    await prisma.jaringAreaCoverage.upsert({
      where: { id: deterministicUuid(`jakarta-demo:jaring-area:${key}`) },
      update: { jaringId, areaId: area.id, isPrimary: true, validUntil: null },
      create: {
        id: deterministicUuid(`jakarta-demo:jaring-area:${key}`),
        jaringId,
        areaId: area.id,
        isPrimary: true,
        validFrom,
      },
    });
    jaringIds.push(jaringId);
  }
  return jaringIds;
}

function verificationStatusFor(status: BaketStatus) {
  if (status === BaketStatus.UNDER_VERIFICATION)
    return VerificationStatus.IN_PROGRESS;
  if (status === BaketStatus.NEEDS_DEVELOPMENT)
    return VerificationStatus.NEEDS_DEVELOPMENT;
  if (status === BaketStatus.VERIFIED) return VerificationStatus.VERIFIED;
  return null;
}

async function seedAreaBakets(params: {
  area: DemoArea;
  areaIndex: number;
  taskAssignmentId: string;
  jaringIds: string[];
  categoryIds: string[];
  files: DemoFile[];
  operationalManager: Assignment;
}) {
  const records: DemoBaket[] = [];
  for (
    let reportIndex = 0;
    reportIndex < baketStatuses.length;
    reportIndex += 1
  ) {
    const { area, areaIndex } = params;
    const status = baketStatuses[reportIndex];
    const key = `${area.officialCode}:${reportIndex + 1}`;
    const baketId = deterministicUuid(`jakarta-demo:baket:${key}`);
    const versionId = deterministicUuid(`jakarta-demo:baket-version:${key}`);
    const verificationId = deterministicUuid(
      `jakarta-demo:verification:${key}`,
    );
    const topic = reportTopics[(areaIndex + reportIndex) % reportTopics.length];
    const eventTime = addHours(seedBaseDate, areaIndex * 72 + reportIndex * 8);
    const title = `${topic.title} - ${trimAreaName(area.name)}`;
    const originalContent = `${SEED_TAG}\nPada ${eventTime.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}, sumber melaporkan bahwa ${topic.fact.toLowerCase()} Lokasi kegiatan berada di ${area.name}. Informasi diperoleh melalui pemantauan langsung dan konfirmasi dengan dua sumber lokal.`;
    const verificationStatus = verificationStatusFor(status);
    const categoryId =
      params.categoryIds[
        (areaIndex * 2 + reportIndex) % params.categoryIds.length
      ];
    const photo =
      params.files[
        (areaIndex * baketStatuses.length + reportIndex) % params.files.length
      ];
    const offset = (reportIndex - 3) * 0.0008;

    await prisma.baket.upsert({
      where: { id: baketId },
      update: {
        createdByFieldOfficerAssignmentId: area.fieldOfficer.id,
        taskAssignmentId: params.taskAssignmentId,
        primaryJaringId:
          params.jaringIds[reportIndex % params.jaringIds.length],
        reportCategoryId: categoryId,
        status,
        currentVersionNumber: 1,
        deletedAt: null,
      },
      create: {
        id: baketId,
        createdByFieldOfficerAssignmentId: area.fieldOfficer.id,
        taskAssignmentId: params.taskAssignmentId,
        primaryJaringId:
          params.jaringIds[reportIndex % params.jaringIds.length],
        reportCategoryId: categoryId,
        status,
        currentVersionNumber: 1,
        createdAt: eventTime,
      },
    });
    await prisma.baketVersion.upsert({
      where: { id: versionId },
      update: {
        baketId,
        versionNumber: 1,
        originalContent,
        normalizedContent: `${topic.fact} ${topic.implication}`,
        eventAreaId: area.id,
        latitude: area.centroidLatitude + offset,
        longitude: area.centroidLongitude - offset,
        gpsAccuracyMeters: 8 + reportIndex,
        locationCapturedAt: eventTime,
        coordinateSource: CoordinateSource.DEVICE_GPS,
        areaResolutionMethod: AreaResolutionMethod.MANUAL_CONFIRMATION,
        areaResolutionConfidence: 98,
        areaResolvedAt: addHours(eventTime, 1),
        coverageValidationStatus: CoverageValidationStatus.WITHIN_SCOPE,
        coverageValidationNote: `${SEED_TAG} Lokasi berada dalam cakupan petugas, jaring, dan unit Binda DKI Jakarta.`,
        coverageValidatedAt: addHours(eventTime, 1),
        urgency:
          reportIndex % 4 === 0 ? PriorityLevel.HIGH : PriorityLevel.NORMAL,
        fieldOfficerNote: `${SEED_TAG} Mohon korelasikan fakta dengan perkembangan wilayah Jakarta lainnya.`,
        createdByAssignmentId: area.fieldOfficer.id,
      },
      create: {
        id: versionId,
        baketId,
        versionNumber: 1,
        originalContent,
        normalizedContent: `${topic.fact} ${topic.implication}`,
        eventAreaId: area.id,
        latitude: area.centroidLatitude + offset,
        longitude: area.centroidLongitude - offset,
        gpsAccuracyMeters: 8 + reportIndex,
        locationCapturedAt: eventTime,
        coordinateSource: CoordinateSource.DEVICE_GPS,
        areaResolutionMethod: AreaResolutionMethod.MANUAL_CONFIRMATION,
        areaResolutionConfidence: 98,
        areaResolvedAt: addHours(eventTime, 1),
        coverageValidationStatus: CoverageValidationStatus.WITHIN_SCOPE,
        coverageValidationNote: `${SEED_TAG} Lokasi berada dalam cakupan petugas, jaring, dan unit Binda DKI Jakarta.`,
        coverageValidatedAt: addHours(eventTime, 1),
        urgency:
          reportIndex % 4 === 0 ? PriorityLevel.HIGH : PriorityLevel.NORMAL,
        fieldOfficerNote: `${SEED_TAG} Mohon korelasikan fakta dengan perkembangan wilayah Jakarta lainnya.`,
        createdByAssignmentId: area.fieldOfficer.id,
        createdAt: eventTime,
      },
    });
    await prisma.baketVersionAttachment.upsert({
      where: {
        baketVersionId_fileId: { baketVersionId: versionId, fileId: photo.id },
      },
      update: {
        caption: `Dokumentasi lapangan ${trimAreaName(area.name)} - ${topic.title}.`,
      },
      create: {
        baketVersionId: versionId,
        fileId: photo.id,
        caption: `Dokumentasi lapangan ${trimAreaName(area.name)} - ${topic.title}.`,
      },
    });

    for (const scopeType of [
      CoverageScopeType.JARING,
      CoverageScopeType.FIELD_OFFICER,
      CoverageScopeType.FIELD_COORDINATOR,
      CoverageScopeType.ORGANIZATION_UNIT,
    ]) {
      const positionAssignmentId =
        scopeType === CoverageScopeType.FIELD_OFFICER
          ? area.fieldOfficer.id
          : scopeType === CoverageScopeType.FIELD_COORDINATOR
            ? area.coordinator.id
            : scopeType === CoverageScopeType.ORGANIZATION_UNIT
              ? params.operationalManager.id
              : null;
      await prisma.baketCoverageCheck.upsert({
        where: {
          id: deterministicUuid(`jakarta-demo:coverage:${key}:${scopeType}`),
        },
        update: {
          baketVersionId: versionId,
          scopeType,
          areaId: area.id,
          positionAssignmentId,
          isWithinScope: true,
          note: `${SEED_TAG} Cakupan ${scopeType} tervalidasi.`,
          checkedAt: addHours(eventTime, 1),
        },
        create: {
          id: deterministicUuid(`jakarta-demo:coverage:${key}:${scopeType}`),
          baketVersionId: versionId,
          scopeType,
          areaId: area.id,
          positionAssignmentId,
          isWithinScope: true,
          note: `${SEED_TAG} Cakupan ${scopeType} tervalidasi.`,
          checkedAt: addHours(eventTime, 1),
        },
      });
    }

    if (verificationStatus) {
      const completedAt =
        verificationStatus === VerificationStatus.IN_PROGRESS
          ? null
          : addHours(eventTime, 4);
      await prisma.baketVerification.upsert({
        where: { baketVersionId: versionId },
        update: {
          verifiedByAssignmentId: params.operationalManager.id,
          status: verificationStatus,
          sourceReliability:
            reportIndex % 2 === 0 ? SourceReliability.A : SourceReliability.B,
          informationCredibility:
            reportIndex % 3 === 0
              ? InformationCredibility.ONE
              : InformationCredibility.TWO,
          summary:
            verificationStatus === VerificationStatus.NEEDS_DEVELOPMENT
              ? `${SEED_TAG} Diperlukan pendalaman identitas sumber dan foto pembanding.`
              : `${SEED_TAG} Fakta, waktu, lokasi, dan relevansi penugasan telah diperiksa.`,
          startedAt: addHours(eventTime, 2),
          completedAt,
        },
        create: {
          id: verificationId,
          baketVersionId: versionId,
          verifiedByAssignmentId: params.operationalManager.id,
          status: verificationStatus,
          sourceReliability:
            reportIndex % 2 === 0 ? SourceReliability.A : SourceReliability.B,
          informationCredibility:
            reportIndex % 3 === 0
              ? InformationCredibility.ONE
              : InformationCredibility.TWO,
          summary:
            verificationStatus === VerificationStatus.NEEDS_DEVELOPMENT
              ? `${SEED_TAG} Diperlukan pendalaman identitas sumber dan foto pembanding.`
              : `${SEED_TAG} Fakta, waktu, lokasi, dan relevansi penugasan telah diperiksa.`,
          startedAt: addHours(eventTime, 2),
          completedAt,
          createdAt: addHours(eventTime, 2),
        },
      });
      for (const [checkIndex, [code, label]] of verificationChecks.entries()) {
        const checkStatus =
          verificationStatus === VerificationStatus.NEEDS_DEVELOPMENT &&
          checkIndex < 2
            ? VerificationCheckStatus.FAIL
            : verificationStatus === VerificationStatus.IN_PROGRESS &&
                checkIndex > 7
              ? VerificationCheckStatus.WARNING
              : VerificationCheckStatus.PASS;
        await prisma.baketVerificationCheck.upsert({
          where: { verificationId_code: { verificationId, code } },
          update: {
            label,
            status: checkStatus,
            note: `${SEED_TAG} Hasil pemeriksaan ${label.toLowerCase()}.`,
          },
          create: {
            id: deterministicUuid(
              `jakarta-demo:verification-check:${key}:${code}`,
            ),
            verificationId,
            code,
            label,
            status: checkStatus,
            note: `${SEED_TAG} Hasil pemeriksaan ${label.toLowerCase()}.`,
          },
        });
      }
    }

    if (status === BaketStatus.NEEDS_DEVELOPMENT) {
      await prisma.baketRevisionRequest.upsert({
        where: { id: deterministicUuid(`jakarta-demo:revision:${key}`) },
        update: {
          baketId,
          requestedAgainstVersionId: versionId,
          requestedByAssignmentId: params.operationalManager.id,
          reason:
            'Identitas sumber dan dokumentasi pembanding perlu diperdalam.',
          requiredInformation:
            'Tambahkan konfirmasi sumber kedua, foto pembanding, dan kronologi yang lebih rinci.',
          dueDate: addHours(eventTime, 48),
          status: RevisionRequestStatus.OPEN,
          resolvedAt: null,
        },
        create: {
          id: deterministicUuid(`jakarta-demo:revision:${key}`),
          baketId,
          requestedAgainstVersionId: versionId,
          requestedByAssignmentId: params.operationalManager.id,
          reason:
            'Identitas sumber dan dokumentasi pembanding perlu diperdalam.',
          requiredInformation:
            'Tambahkan konfirmasi sumber kedua, foto pembanding, dan kronologi yang lebih rinci.',
          dueDate: addHours(eventTime, 48),
          status: RevisionRequestStatus.OPEN,
          createdAt: addHours(eventTime, 5),
        },
      });
    }

    records.push({
      id: baketId,
      versionId,
      verificationId: verificationStatus ? verificationId : null,
      title,
      originalContent,
      area,
    });
  }
  return records;
}

async function seedAnalyses(params: {
  areas: DemoArea[];
  bakets: DemoBaket[];
  operationalManager: Assignment;
}) {
  const validatedStatuses = [
    AnalysisStatus.VALIDATED,
    AnalysisStatus.VALIDATED,
    AnalysisStatus.VALIDATED,
    AnalysisStatus.VALIDATED,
    AnalysisStatus.DRAFT,
    AnalysisStatus.IN_REVIEW,
    AnalysisStatus.VALIDATED,
    AnalysisStatus.VALIDATED,
  ];
  const groups = params.areas.map((area) => ({
    title: `Analisis situasi strategis ${trimAreaName(area.name)}`,
    sourceBakets: params.bakets.filter(
      (baket) => baket.area.id === area.id && baket.verificationId,
    ),
  }));
  groups.push(
    {
      title: 'Analisis terpadu stabilitas DKI Jakarta',
      sourceBakets: params.areas.flatMap((area) =>
        params.bakets
          .filter((baket) => baket.area.id === area.id && baket.verificationId)
          .slice(0, 1),
      ),
    },
    {
      title: 'Analisis peringatan dini lintas wilayah DKI Jakarta',
      sourceBakets: params.areas.flatMap((area) =>
        params.bakets
          .filter((baket) => baket.area.id === area.id && baket.verificationId)
          .slice(-1),
      ),
    },
  );

  const results: DemoAnalysis[] = [];
  for (const [index, group] of groups.entries()) {
    const caseId = deterministicUuid(`jakarta-demo:analysis-case:${index + 1}`);
    const versionId = deterministicUuid(
      `jakarta-demo:analysis-version:${index + 1}`,
    );
    const status = validatedStatuses[index] ?? AnalysisStatus.VALIDATED;
    const createdAt = addHours(seedBaseDate, 360 + index * 12);
    const areaLabel =
      index < params.areas.length
        ? trimAreaName(params.areas[index].name)
        : 'seluruh wilayah DKI Jakarta';
    const indications = `Terdapat keterkaitan perkembangan mobilitas masyarakat, isu pelayanan publik, distribusi komoditas, dan penyebaran narasi digital di ${areaLabel}.`;
    const analysis = `Korelasi antar-BAKET menunjukkan bahwa perubahan situasi masih bersifat lokal, namun memiliki pola waktu dan aktor penggerak yang serupa. Peningkatan intensitas komunikasi dapat mempercepat perluasan isu antarwilayah.`;
    const impact = `Dampak yang mungkin muncul meliputi gangguan mobilitas, kenaikan tekanan terhadap layanan publik, perubahan persepsi masyarakat, dan kebutuhan pengamanan pada objek strategis.`;
    const efforts = `Melaksanakan pemantauan berkelanjutan, konfirmasi silang dengan jaring, koordinasi kewilayahan, dan pembaruan situasi secara periodik.`;
    const recommendations = `Pertahankan deteksi dini, siapkan komunikasi publik berbasis fakta, dan prioritaskan koordinasi pada titik yang memperlihatkan eskalasi indikator.`;

    await prisma.analysisCase.upsert({
      where: { id: caseId },
      update: {
        ownerUnitId: params.operationalManager.position.organizationUnitId,
        createdByAssignmentId: params.operationalManager.id,
        title: group.title,
        status,
        periodStart: seedBaseDate,
        periodEnd: addHours(seedBaseDate, 336),
        currentVersionNumber: 1,
      },
      create: {
        id: caseId,
        ownerUnitId: params.operationalManager.position.organizationUnitId,
        createdByAssignmentId: params.operationalManager.id,
        title: group.title,
        status,
        periodStart: seedBaseDate,
        periodEnd: addHours(seedBaseDate, 336),
        currentVersionNumber: 1,
        createdAt,
      },
    });
    await prisma.analysisVersion.upsert({
      where: {
        analysisCaseId_versionNumber: {
          analysisCaseId: caseId,
          versionNumber: 1,
        },
      },
      update: {
        indications,
        analysis,
        impact,
        efforts,
        recommendations,
        aiDraft: {
          seeded: true,
          confidence: 0.88,
          sourceCount: group.sourceBakets.length,
        },
        createdByAssignmentId: params.operationalManager.id,
        validatedByAssignmentId:
          status === AnalysisStatus.VALIDATED
            ? params.operationalManager.id
            : null,
        validatedAt:
          status === AnalysisStatus.VALIDATED ? addHours(createdAt, 4) : null,
      },
      create: {
        id: versionId,
        analysisCaseId: caseId,
        versionNumber: 1,
        indications,
        analysis,
        impact,
        efforts,
        recommendations,
        aiDraft: {
          seeded: true,
          confidence: 0.88,
          sourceCount: group.sourceBakets.length,
        },
        createdByAssignmentId: params.operationalManager.id,
        validatedByAssignmentId:
          status === AnalysisStatus.VALIDATED
            ? params.operationalManager.id
            : null,
        validatedAt:
          status === AnalysisStatus.VALIDATED ? addHours(createdAt, 4) : null,
        createdAt,
      },
    });
    const sourceIds = group.sourceBakets.flatMap((baket) =>
      baket.verificationId ? [baket.verificationId] : [],
    );
    await prisma.analysisSourceVerification.deleteMany({
      where: { analysisCaseId: caseId, verificationId: { notIn: sourceIds } },
    });
    for (const verificationId of sourceIds) {
      await prisma.analysisSourceVerification.upsert({
        where: {
          analysisCaseId_verificationId: {
            analysisCaseId: caseId,
            verificationId,
          },
        },
        update: {},
        create: { analysisCaseId: caseId, verificationId },
      });
    }

    const entitySeeds = [
      [IntelEntityType.LOCATION, areaLabel, { category: 'wilayah_pemantauan' }],
      [
        IntelEntityType.ISSUE,
        'Stabilitas wilayah',
        { category: 'isu_strategis' },
      ],
      [
        IntelEntityType.EVENT,
        'Perkembangan situasi Juli 2026',
        { category: 'periode' },
      ],
    ] as const;
    const entityIds: string[] = [];
    for (const [
      entityIndex,
      [entityType, name, metadata],
    ] of entitySeeds.entries()) {
      const entityId = deterministicUuid(
        `jakarta-demo:analysis-entity:${index + 1}:${entityIndex + 1}`,
      );
      await prisma.analysisEntity.upsert({
        where: { id: entityId },
        update: {
          analysisVersionId: versionId,
          entityType,
          name,
          normalizedName: name.toLowerCase(),
          metadata,
        },
        create: {
          id: entityId,
          analysisVersionId: versionId,
          entityType,
          name,
          normalizedName: name.toLowerCase(),
          metadata,
        },
      });
      entityIds.push(entityId);
    }
    for (
      let relationshipIndex = 0;
      relationshipIndex < 2;
      relationshipIndex += 1
    ) {
      const relationshipId = deterministicUuid(
        `jakarta-demo:analysis-relationship:${index + 1}:${relationshipIndex + 1}`,
      );
      await prisma.analysisRelationship.upsert({
        where: { id: relationshipId },
        update: {
          analysisVersionId: versionId,
          fromEntityId: entityIds[relationshipIndex],
          toEntityId: entityIds[relationshipIndex + 1],
          relationshipType:
            relationshipIndex === 0 ? 'BERLOKASI_DI' : 'MEMENGARUHI',
          description: `${SEED_TAG} Hubungan terkonfirmasi dari korelasi BAKET.`,
          confidence: 87 + relationshipIndex * 5,
        },
        create: {
          id: relationshipId,
          analysisVersionId: versionId,
          fromEntityId: entityIds[relationshipIndex],
          toEntityId: entityIds[relationshipIndex + 1],
          relationshipType:
            relationshipIndex === 0 ? 'BERLOKASI_DI' : 'MEMENGARUHI',
          description: `${SEED_TAG} Hubungan terkonfirmasi dari korelasi BAKET.`,
          confidence: 87 + relationshipIndex * 5,
        },
      });
    }
    results.push({
      caseId,
      versionId,
      title: group.title,
      status,
      sourceBakets: group.sourceBakets,
    });
  }
  return results;
}

function buildProductContent(
  productTypeCode: string,
  sections: Array<{
    code: string;
    isRepeatable: boolean;
    fields: Array<{ code: string }>;
  }>,
  analyses: DemoAnalysis[],
) {
  if (productTypeCode === 'JURNAL_INFORMASI') {
    const sourceBakets = analyses
      .flatMap((analysis) => analysis.sourceBakets)
      .slice(0, 8);
    return {
      ITEMS: sourceBakets.map((baket, index) => ({
        NO_URUT: index + 1,
        PERMASALAHAN_AGENDA: baket.title,
        DAERAH_KEJADIAN: baket.area.name,
        MATERI_SUMBER: `${baket.originalContent}\n\nSumber: ${baket.area.fieldOfficer.userProfile.fullName ?? 'Field Officer'}`,
      })),
    } satisfies Prisma.InputJsonObject;
  }

  const narrativeByCode: Record<string, string> = {
    FAKTA:
      'Berdasarkan rangkaian BAKET terverifikasi, situasi DKI Jakarta relatif terkendali dengan beberapa indikator peningkatan aktivitas pada pusat pemerintahan, simpul transportasi, pasar, dan ruang digital.',
    CATATAN:
      'Data dihimpun oleh Field Officer wilayah Jakarta dan telah melalui pemeriksaan sumber, waktu, lokasi, dokumentasi, serta relevansi penugasan.',
    LAMPIRAN:
      'Dokumentasi foto lapangan dan daftar BAKET sumber terhubung pada versi produk ini.',
    INDIKASI:
      'Terlihat pola keterkaitan antara mobilitas kelompok, dinamika pelayanan publik, distribusi komoditas, dan sebaran narasi digital lintas wilayah.',
    ANALISIS:
      'Perkembangan masih dapat dikelola, namun kesamaan waktu dan pola komunikasi menunjukkan potensi perluasan isu apabila terjadi pemicu tambahan.',
    DAMPAK:
      'Potensi dampak mencakup gangguan mobilitas, peningkatan tekanan pelayanan publik, perubahan persepsi masyarakat, dan kebutuhan pengamanan objek strategis.',
    UPAYA:
      'Pemantauan diperkuat melalui jaring, koordinasi kewilayahan, validasi silang, dan pembaruan informasi secara periodik.',
    SARAN_TINDAK:
      'Pertahankan deteksi dini, percepat klarifikasi berbasis fakta, dan prioritaskan koordinasi pada indikator yang menunjukkan eskalasi.',
    PENDAHULUAN:
      'Produk ini menyajikan gambaran dasar lingkungan strategis DKI Jakarta sebagai pusat pemerintahan, ekonomi, transportasi, dan komunikasi nasional.',
    KEDALAMAN:
      'Pembahasan mencakup karakter wilayah, aktor komunitas, simpul strategis, pola mobilitas, distribusi logistik, dan dinamika informasi.',
    ANTESEDEN:
      'Dinamika saat ini dipengaruhi kepadatan penduduk, aktivitas komuter, konsentrasi objek vital, serta tingginya penetrasi media digital.',
    SPOT_INTELIJEN:
      'Titik perhatian utama berada pada pusat pemerintahan, simpul transportasi, pasar induk, kawasan pesisir, dan permukiman rawan genangan.',
    DAFTAR_PUSTAKA:
      'BAKET Field Officer DKI Jakarta periode 7-14 Juli 2026; hasil verifikasi OIM Binda DKI Jakarta.',
    SITUASI_DALAM_NEGERI:
      'Situasi Jakarta secara umum kondusif. Aktivitas masyarakat meningkat pada pusat ekonomi dan pemerintahan dengan beberapa isu lokal yang memerlukan pemantauan.',
    SITUASI_LUAR_NEGERI:
      'Belum ditemukan dampak langsung perkembangan luar negeri terhadap stabilitas Jakarta, namun isu ekonomi global tetap memengaruhi persepsi harga komoditas.',
  };
  const content: Record<string, Prisma.InputJsonValue> = {};
  for (const section of sections) {
    if (section.isRepeatable) continue;
    const sectionContent: Record<string, Prisma.InputJsonValue> = {};
    for (const field of section.fields) {
      sectionContent[field.code] =
        narrativeByCode[section.code] ??
        `Uraian ${section.code.replaceAll('_', ' ').toLowerCase()} berdasarkan analisis final DKI Jakarta.`;
    }
    content[section.code] = sectionContent;
  }
  return content as Prisma.InputJsonObject;
}

async function upsertNotification(params: {
  key: string;
  userProfileId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  createdAt: Date;
  readAt?: Date | null;
}) {
  await prisma.notification.upsert({
    where: { id: deterministicUuid(`jakarta-demo:notification:${params.key}`) },
    update: {
      userProfileId: params.userProfileId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
      readAt: params.readAt ?? null,
    },
    create: {
      id: deterministicUuid(`jakarta-demo:notification:${params.key}`),
      userProfileId: params.userProfileId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
      createdAt: params.createdAt,
      readAt: params.readAt ?? null,
    },
  });
}

async function seedProducts(params: {
  productTypes: Awaited<ReturnType<typeof loadContext>>['productTypes'];
  analyses: DemoAnalysis[];
  files: DemoFile[];
  operationalManager: Assignment;
  regionalCommander: Assignment;
  executive: Assignment;
}) {
  const validatedAnalyses = params.analyses.filter(
    (analysis) => analysis.status === AnalysisStatus.VALIDATED,
  );
  let productCount = 0;
  for (const [typeIndex, productType] of params.productTypes.entries()) {
    const template = productType.templates[0];
    if (!template)
      throw new Error(`Active template for ${productType.code} is missing.`);
    for (let variant = 0; variant < 3; variant += 1) {
      productCount += 1;
      const key = `${productType.code}:${variant + 1}`;
      const productId = deterministicUuid(`jakarta-demo:product:${key}`);
      const versionId = deterministicUuid(
        `jakarta-demo:product-version:${key}`,
      );
      const workflowId = deterministicUuid(`jakarta-demo:workflow:${key}`);
      const stepId = deterministicUuid(`jakarta-demo:approval-step:${key}`);
      const createdAt = addHours(seedBaseDate, 500 + productCount * 6);
      const productStatus =
        variant === 0
          ? ProductStatus.DRAFT
          : variant === 1
            ? ProductStatus.UNDER_REGIONAL_REVIEW
            : typeIndex % 2 === 0
              ? ProductStatus.DISTRIBUTED
              : ProductStatus.APPROVED_REGIONAL;
      const sourceAnalyses = [
        validatedAnalyses[(typeIndex + variant) % validatedAnalyses.length],
        validatedAnalyses[(typeIndex + variant + 1) % validatedAnalyses.length],
      ].filter(
        (value, index, all) =>
          all.findIndex((entry) => entry.versionId === value.versionId) ===
          index,
      );
      const sourceBakets = sourceAnalyses
        .flatMap((analysis) => analysis.sourceBakets)
        .filter((baket) => baket.verificationId)
        .slice(0, 6);
      const titleSuffix =
        variant === 0
          ? 'Draft'
          : variant === 1
            ? 'Menunggu Persetujuan'
            : 'Final';
      const title = `${productType.name} Situasi DKI Jakarta - ${titleSuffix}`;
      const productNumber = `DEMO/${productType.numberCode}/DKI/${DEMO_YEAR}/${String(typeIndex * 3 + variant + 1).padStart(3, '0')}`;
      const content = buildProductContent(
        productType.code,
        template.sections,
        sourceAnalyses,
      );

      await prisma.intelligenceProduct.upsert({
        where: { productNumber },
        update: {
          productTypeId: productType.id,
          ownerUnitId: params.operationalManager.position.organizationUnitId,
          createdByAssignmentId: params.operationalManager.id,
          classification:
            variant === 2 ? Classification.RAHASIA : Classification.TERBATAS,
          title,
          status: productStatus,
          currentVersionNumber: 1,
          periodStart: seedBaseDate,
          periodEnd: addHours(seedBaseDate, 336),
          deletedAt: null,
        },
        create: {
          id: productId,
          productTypeId: productType.id,
          ownerUnitId: params.operationalManager.position.organizationUnitId,
          createdByAssignmentId: params.operationalManager.id,
          productNumber,
          classification:
            variant === 2 ? Classification.RAHASIA : Classification.TERBATAS,
          title,
          status: productStatus,
          currentVersionNumber: 1,
          periodStart: seedBaseDate,
          periodEnd: addHours(seedBaseDate, 336),
          createdAt,
        },
      });
      await prisma.productVersion.upsert({
        where: { productId_versionNumber: { productId, versionNumber: 1 } },
        update: {
          templateId: template.id,
          routingTo: 'Kepada Yth. Deputi II',
          routingFrom: 'Binda Daerah Khusus Ibukota Jakarta',
          routingCc: 'Direktur Wilayah Jawa Bali',
          subject: title,
          sourceReliability: SourceReliability.B,
          informationCredibility: InformationCredibility.TWO,
          content,
          createdByAssignmentId: params.operationalManager.id,
          changeReason: `${SEED_TAG} Dataset presentasi DKI Jakarta.`,
        },
        create: {
          id: versionId,
          productId,
          templateId: template.id,
          versionNumber: 1,
          routingTo: 'Kepada Yth. Deputi II',
          routingFrom: 'Binda Daerah Khusus Ibukota Jakarta',
          routingCc: 'Direktur Wilayah Jawa Bali',
          subject: title,
          sourceReliability: SourceReliability.B,
          informationCredibility: InformationCredibility.TWO,
          content,
          createdByAssignmentId: params.operationalManager.id,
          changeReason: `${SEED_TAG} Dataset presentasi DKI Jakarta.`,
          createdAt,
        },
      });
      for (const analysis of sourceAnalyses) {
        await prisma.productSourceAnalysis.upsert({
          where: {
            productVersionId_analysisVersionId: {
              productVersionId: versionId,
              analysisVersionId: analysis.versionId,
            },
          },
          update: {},
          create: {
            productVersionId: versionId,
            analysisVersionId: analysis.versionId,
          },
        });
      }
      for (const baket of sourceBakets) {
        if (!baket.verificationId) continue;
        await prisma.productSourceVerification.upsert({
          where: {
            productVersionId_verificationId: {
              productVersionId: versionId,
              verificationId: baket.verificationId,
            },
          },
          update: {},
          create: {
            productVersionId: versionId,
            verificationId: baket.verificationId,
          },
        });
      }
      for (let attachmentIndex = 0; attachmentIndex < 2; attachmentIndex += 1) {
        const file =
          params.files[(productCount + attachmentIndex) % params.files.length];
        await prisma.productAttachment.upsert({
          where: {
            productVersionId_fileId: {
              productVersionId: versionId,
              fileId: file.id,
            },
          },
          update: { caption: `Lampiran dokumentasi ${title}.` },
          create: {
            productVersionId: versionId,
            fileId: file.id,
            caption: `Lampiran dokumentasi ${title}.`,
          },
        });
      }

      if (variant > 0) {
        const isComplete = variant === 2;
        const decidedAt = isComplete ? addHours(createdAt, 6) : null;
        await prisma.productApprovalWorkflow.upsert({
          where: { productVersionId: versionId },
          update: {
            routeType: CommandRouteType.BINDA,
            status: isComplete
              ? ApprovalWorkflowStatus.APPROVED
              : ApprovalWorkflowStatus.IN_PROGRESS,
            currentStepNumber: 1,
            startedAt: addHours(createdAt, 2),
            completedAt: decidedAt,
            cancelledAt: null,
          },
          create: {
            id: workflowId,
            productVersionId: versionId,
            routeType: CommandRouteType.BINDA,
            status: isComplete
              ? ApprovalWorkflowStatus.APPROVED
              : ApprovalWorkflowStatus.IN_PROGRESS,
            currentStepNumber: 1,
            startedAt: addHours(createdAt, 2),
            completedAt: decidedAt,
          },
        });
        await prisma.productApprovalStep.upsert({
          where: { workflowId_stepNumber: { workflowId, stepNumber: 1 } },
          update: {
            stage: ApprovalStage.REGIONAL,
            targetSeatId: params.regionalCommander.seatId,
            targetPositionId: params.regionalCommander.positionId,
            status: isComplete
              ? ApprovalStepStatus.APPROVED
              : ApprovalStepStatus.ACTIVE,
            decision: isComplete ? ApprovalDecision.APPROVE : null,
            decisionNote: isComplete
              ? 'Disetujui untuk menjadi bahan laporan pimpinan.'
              : null,
            dueAt: addHours(createdAt, 72),
            activatedAt: addHours(createdAt, 2),
            decidedAt,
            decidedByAssignmentId: isComplete
              ? params.regionalCommander.id
              : null,
          },
          create: {
            id: stepId,
            workflowId,
            stepNumber: 1,
            stage: ApprovalStage.REGIONAL,
            targetSeatId: params.regionalCommander.seatId,
            targetPositionId: params.regionalCommander.positionId,
            status: isComplete
              ? ApprovalStepStatus.APPROVED
              : ApprovalStepStatus.ACTIVE,
            decision: isComplete ? ApprovalDecision.APPROVE : null,
            decisionNote: isComplete
              ? 'Disetujui untuk menjadi bahan laporan pimpinan.'
              : null,
            dueAt: addHours(createdAt, 72),
            activatedAt: addHours(createdAt, 2),
            decidedAt,
            decidedByAssignmentId: isComplete
              ? params.regionalCommander.id
              : null,
          },
        });
        const approvalEventId = deterministicUuid(
          `jakarta-demo:approval-event:${key}`,
        );
        const approvalEvent = await prisma.productApprovalEvent.findUnique({
          where: { id: approvalEventId },
          select: { id: true },
        });
        if (!approvalEvent) {
          await prisma.productApprovalEvent.create({
            data: {
              id: approvalEventId,
              workflowId,
              stepId,
              eventType: isComplete
                ? ApprovalEventType.APPROVED
                : ApprovalEventType.ACTIVATED,
              actorAssignmentId: isComplete
                ? params.regionalCommander.id
                : params.operationalManager.id,
              note: isComplete
                ? 'Produk telah disetujui Regional Commander.'
                : 'Produk diajukan untuk persetujuan Regional Commander.',
              metadata: { seeded: true, provinceCode: JAKARTA_PROVINCE_CODE },
              createdAt: isComplete
                ? (decidedAt ?? createdAt)
                : addHours(createdAt, 2),
            },
          });
        }
        await upsertNotification({
          key: `regional:${key}`,
          userProfileId: params.regionalCommander.userProfileId,
          type: NotificationType.APPROVAL,
          title: isComplete
            ? 'Produk telah diputuskan'
            : 'Persetujuan produk DKI Jakarta',
          message: isComplete
            ? `${title} telah Anda setujui.`
            : `${title} menunggu keputusan Regional Commander.`,
          link: `/dashboard/regional-commander/laporan-intelijen`,
          createdAt: addHours(createdAt, 2),
          readAt: isComplete ? decidedAt : null,
        });
      }

      if (productStatus === ProductStatus.DISTRIBUTED) {
        for (const [distributionIndex, target] of [
          { targetPositionId: params.executive.positionId, targetUnitId: null },
          {
            targetPositionId: null,
            targetUnitId: params.executive.position.organizationUnitId,
          },
        ].entries()) {
          const sentAt = addHours(createdAt, 8 + distributionIndex);
          await prisma.productDistribution.upsert({
            where: {
              id: deterministicUuid(
                `jakarta-demo:distribution:${key}:${distributionIndex + 1}`,
              ),
            },
            update: {
              productVersionId: versionId,
              sentByAssignmentId: params.operationalManager.id,
              targetPositionId: target.targetPositionId,
              targetUnitId: target.targetUnitId,
              targetSeatId: null,
              targetUserProfileId: null,
              status:
                distributionIndex === 0
                  ? DistributionStatus.READ
                  : DistributionStatus.DELIVERED,
              sentAt,
              deliveredAt: addHours(sentAt, 1),
              readAt: distributionIndex === 0 ? addHours(sentAt, 2) : null,
              revokedAt: null,
              failureReason: null,
            },
            create: {
              id: deterministicUuid(
                `jakarta-demo:distribution:${key}:${distributionIndex + 1}`,
              ),
              productVersionId: versionId,
              sentByAssignmentId: params.operationalManager.id,
              targetPositionId: target.targetPositionId,
              targetUnitId: target.targetUnitId,
              status:
                distributionIndex === 0
                  ? DistributionStatus.READ
                  : DistributionStatus.DELIVERED,
              sentAt,
              deliveredAt: addHours(sentAt, 1),
              readAt: distributionIndex === 0 ? addHours(sentAt, 2) : null,
            },
          });
        }
      }
      if (variant === 2) {
        await upsertNotification({
          key: `executive:${key}`,
          userProfileId: params.executive.userProfileId,
          type: NotificationType.PRODUCT,
          title: 'Produk intelijen DKI Jakarta tersedia',
          message: `${title} telah disetujui Regional Commander dan tersedia untuk dibaca pimpinan.`,
          link: `/dashboard/executive/laporan-intelijen`,
          createdAt: addHours(createdAt, 7),
          readAt:
            productStatus === ProductStatus.DISTRIBUTED
              ? addHours(createdAt, 10)
              : null,
        });
      }
    }
  }
  return productCount;
}

async function seedJakartaDemo() {
  const context = await loadContext();
  const files = await registerStoragePhotos(context.operationalManager.id);
  const categoryIds = context.categories.map((category) => category.id);
  const bakets: DemoBaket[] = [];

  for (const [areaIndex, area] of context.areas.entries()) {
    const taskAssignmentId = await seedAreaTask(
      area,
      context.operationalManager,
    );
    const jaringIds = await seedAreaJaring(area);
    bakets.push(
      ...(await seedAreaBakets({
        area,
        areaIndex,
        taskAssignmentId,
        jaringIds,
        categoryIds,
        files,
        operationalManager: context.operationalManager,
      })),
    );
  }

  const analyses = await seedAnalyses({
    areas: context.areas,
    bakets,
    operationalManager: context.operationalManager,
  });
  const productCount = await seedProducts({
    productTypes: context.productTypes,
    analyses,
    files,
    operationalManager: context.operationalManager,
    regionalCommander: context.regionalCommander,
    executive: context.executive,
  });

  console.log('Seeded Jakarta presentation dataset.');
  console.log(`- Jakarta regency/city areas: ${context.areas.length}`);
  console.log(`- Storage photos registered: ${files.length}`);
  console.log(`- Demo tasks: ${context.areas.length}`);
  console.log(`- Demo Jaring: ${context.areas.length * 2}`);
  console.log(`- Demo Bakets: ${bakets.length}`);
  console.log(`- Demo analyses: ${analyses.length}`);
  console.log(`- Demo intelligence products: ${productCount}`);
}

void seedJakartaDemo()
  .catch((error: unknown) => {
    console.error('Failed to seed Jakarta presentation data.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
