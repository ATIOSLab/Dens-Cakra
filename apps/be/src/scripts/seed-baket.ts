import { createHash } from 'node:crypto';
import {
  AreaResolutionMethod,
  BaketStatus,
  CoordinateSource,
  CoverageScopeType,
  CoverageValidationStatus,
  InformationCredibility,
  JaringStatus,
  PriorityLevel,
  RoleCode,
  SourceReliability,
  VerificationCheckStatus,
  VerificationStatus,
} from '../generated/prisma/client.js';
import { prisma } from '../modules/prisma/prisma.service.js';

const SEED_TAG = '[SEED_BAKET_VERIFIED]';
const seedBaseDate = new Date('2026-07-01T01:00:00.000Z');

const clusterSeeds = [
  {
    code: 'POLITICAL_SECURITY',
    name: 'Politik dan Keamanan',
    description:
      'Jaring pada isu politik, pemerintahan, dan stabilitas keamanan.',
  },
  {
    code: 'ECONOMY_FINANCE',
    name: 'Ekonomi dan Keuangan',
    description: 'Jaring pada aktivitas ekonomi, perdagangan, dan keuangan.',
  },
  {
    code: 'SOCIAL_CULTURE',
    name: 'Sosial dan Budaya',
    description:
      'Jaring pada dinamika sosial, komunitas, pendidikan, dan budaya.',
  },
  {
    code: 'DEFENSE_SECURITY',
    name: 'Pertahanan dan Keamanan',
    description: 'Jaring pada objek vital, pertahanan, dan keamanan wilayah.',
  },
  {
    code: 'CYBER_INFORMATION',
    name: 'Siber dan Informasi',
    description: 'Jaring pada ruang siber, media, dan ekosistem informasi.',
  },
  {
    code: 'TRANSNATIONAL',
    name: 'Kejahatan Transnasional',
    description:
      'Jaring pada lintas batas, penyelundupan, dan jaringan transnasional.',
  },
  {
    code: 'NATURAL_RESOURCES',
    name: 'Sumber Daya Alam',
    description:
      'Jaring pada energi, pangan, lingkungan, dan sumber daya alam.',
  },
  {
    code: 'STRATEGIC_INFRASTRUCTURE',
    name: 'Infrastruktur Strategis',
    description:
      'Jaring pada transportasi, telekomunikasi, dan infrastruktur vital.',
  },
] as const;

const categorySeeds = [
  {
    code: 'SITUATION_UPDATE',
    name: 'Perkembangan Situasi',
    description: 'Laporan perkembangan kondisi wilayah secara periodik.',
  },
  {
    code: 'INCIDENT_REPORT',
    name: 'Kejadian Menonjol',
    description: 'Laporan kejadian lapangan yang memerlukan perhatian.',
  },
  {
    code: 'EARLY_WARNING',
    name: 'Peringatan Dini',
    description: 'Laporan indikasi awal dan potensi eskalasi.',
  },
  {
    code: 'PERSONNEL_MOVEMENT',
    name: 'Pergerakan Orang dan Kelompok',
    description: 'Laporan mobilitas aktor, kelompok, atau massa.',
  },
  {
    code: 'COMMUNITY_DYNAMICS',
    name: 'Dinamika Masyarakat',
    description: 'Laporan aspirasi, respons, dan dinamika komunitas.',
  },
  {
    code: 'ECONOMIC_ACTIVITY',
    name: 'Aktivitas Ekonomi',
    description: 'Laporan aktivitas ekonomi dan distribusi komoditas.',
  },
  {
    code: 'CYBER_INFORMATION',
    name: 'Informasi Siber dan Media',
    description: 'Laporan isu siber, disinformasi, dan media digital.',
  },
  {
    code: 'BORDER_MARITIME',
    name: 'Perbatasan dan Maritim',
    description:
      'Laporan aktivitas perbatasan, pelabuhan, dan wilayah maritim.',
  },
] as const;

const reportTopics = [
  {
    title: 'Perkembangan stabilitas wilayah',
    finding:
      'Aktivitas masyarakat berlangsung terkendali dengan peningkatan mobilitas pada pusat kegiatan.',
    implication:
      'Perubahan pola mobilitas perlu dipantau untuk mengantisipasi konsentrasi massa spontan.',
  },
  {
    title: 'Kejadian menonjol pada fasilitas publik',
    finding:
      'Terjadi peningkatan aktivitas tidak biasa di sekitar fasilitas publik strategis.',
    implication:
      'Koordinasi dengan unsur pengamanan setempat perlu ditingkatkan pada jam rawan.',
  },
  {
    title: 'Indikasi awal potensi eskalasi',
    finding:
      'Percakapan komunitas lokal menunjukkan ajakan konsolidasi pada waktu yang berdekatan.',
    implication:
      'Diperlukan pemantauan lanjutan untuk memastikan skala, aktor, dan tujuan kegiatan.',
  },
  {
    title: 'Pergerakan kelompok lintas wilayah',
    finding:
      'Terdeteksi pergerakan kelompok kecil melalui simpul transportasi utama wilayah.',
    implication:
      'Perlu pertukaran informasi dengan wilayah berbatasan untuk memastikan tujuan pergerakan.',
  },
  {
    title: 'Dinamika aspirasi masyarakat',
    finding:
      'Aspirasi masyarakat menguat pada isu pelayanan publik dan distribusi bantuan.',
    implication:
      'Respons komunikasi publik yang cepat dapat mengurangi potensi perluasan isu.',
  },
  {
    title: 'Perubahan aktivitas ekonomi lokal',
    finding:
      'Distribusi komoditas utama mengalami perubahan volume dan jadwal pada beberapa titik.',
    implication:
      'Perubahan tersebut perlu dikonfirmasi untuk mencegah gangguan pasokan dan spekulasi harga.',
  },
  {
    title: 'Sebaran informasi digital lokal',
    finding:
      'Narasi yang belum terverifikasi menyebar pada kanal media sosial komunitas wilayah.',
    implication:
      'Klarifikasi berbasis fakta diperlukan sebelum narasi memengaruhi persepsi masyarakat.',
  },
  {
    title: 'Aktivitas pada jalur perbatasan dan maritim',
    finding:
      'Terdapat perubahan waktu dan frekuensi aktivitas angkutan pada jalur keluar masuk wilayah.',
    implication:
      'Pemantauan terpadu diperlukan untuk memastikan kepatuhan dokumen dan pola pergerakan.',
  },
] as const;

const verificationChecks = [
  ['SOURCE_IDENTITY', 'Identitas sumber', VerificationCheckStatus.PASS],
  ['TITLE_COMPLETENESS', 'Kelengkapan judul', VerificationCheckStatus.PASS],
  ['PHOTO_VALIDITY', 'Validitas foto', VerificationCheckStatus.NOT_APPLICABLE],
  ['GPS_VALIDITY', 'Validitas koordinat GPS', VerificationCheckStatus.PASS],
  ['CONTENT_COMPLETENESS', 'Kelengkapan isi', VerificationCheckStatus.PASS],
  ['TASK_RELEVANCE', 'Relevansi dengan tugas', VerificationCheckStatus.PASS],
  ['UUK_RELEVANCE', 'Relevansi dengan UUK/STR', VerificationCheckStatus.PASS],
  ['DUPLICATE_CHECK', 'Pemeriksaan duplikasi', VerificationCheckStatus.PASS],
  ['TIME_CONSISTENCY', 'Konsistensi waktu', VerificationCheckStatus.PASS],
  ['LOCATION_CONSISTENCY', 'Konsistensi lokasi', VerificationCheckStatus.PASS],
  [
    'CROSS_REFERENCE',
    'Referensi silang',
    VerificationCheckStatus.NOT_APPLICABLE,
  ],
] as const;

type AssignmentNode = {
  id: string;
  positionId: string;
  reportsToPositionId: string | null;
  roleCode: RoleCode;
  fullName: string | null;
  organizationUnitName: string;
  area: {
    id: string;
    officialCode: string | null;
    name: string;
    centroidLatitude: number;
    centroidLongitude: number;
  } | null;
  taskAssignmentId: string | null;
};

type SeedChain = {
  operationalManager: AssignmentNode;
  reports: Array<{
    fieldCoordinator: AssignmentNode;
    fieldOfficer: AssignmentNode;
  }>;
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

function addHours(base: Date, hours: number) {
  return new Date(base.getTime() + hours * 60 * 60 * 1000);
}

function compactCode(value: string) {
  return value.replace(/[^A-Z0-9]+/gi, '').toUpperCase();
}

async function upsertMasterData() {
  const clusters = [];
  const categories = [];

  for (const seed of clusterSeeds) {
    clusters.push(
      await prisma.jaringCluster.upsert({
        where: { code: seed.code },
        update: {
          name: seed.name,
          description: seed.description,
          isActive: true,
        },
        create: {
          code: seed.code,
          name: seed.name,
          description: seed.description,
          isActive: true,
        },
      }),
    );
  }

  for (const seed of categorySeeds) {
    categories.push(
      await prisma.reportCategory.upsert({
        where: { code: seed.code },
        update: {
          name: seed.name,
          description: seed.description,
          isActive: true,
        },
        create: {
          code: seed.code,
          name: seed.name,
          description: seed.description,
          isActive: true,
        },
      }),
    );
  }

  return { clusters, categories };
}

async function loadSeedChains(): Promise<SeedChain[]> {
  const rows = await prisma.userSeatAssignment.findMany({
    where: {
      isPrimary: true,
      isActive: true,
      validUntil: null,
      userProfile: { isActive: true, deletedAt: null },
      position: {
        isActive: true,
        role: {
          code: {
            in: [
              RoleCode.OPERATIONAL_INTELLIGENCE_MANAGER,
              RoleCode.FIELD_COORDINATOR,
              RoleCode.FIELD_OFFICER,
            ],
          },
        },
      },
    },
    select: {
      id: true,
      userProfile: { select: { fullName: true } },
      position: {
        select: {
          id: true,
          reportsToPositionId: true,
          role: { select: { code: true } },
          organizationUnit: { select: { name: true } },
        },
      },
      areaScopes: {
        where: { validUntil: null, area: { deletedAt: null, isActive: true } },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        take: 1,
        select: {
          area: {
            select: {
              id: true,
              officialCode: true,
              name: true,
              centroidLatitude: true,
              centroidLongitude: true,
            },
          },
        },
      },
      taskAssignmentsReceived: {
        where: { assignmentNote: { contains: '[SEED_STR_HIERARCHY]' } },
        orderBy: { assignedAt: 'desc' },
        take: 1,
        select: { id: true },
      },
    },
  });

  const assignments: AssignmentNode[] = rows.map((row) => {
    const rawArea = row.areaScopes[0]?.area;
    const area =
      rawArea?.centroidLatitude !== null && rawArea?.centroidLongitude !== null
        ? {
            id: rawArea.id,
            officialCode: rawArea.officialCode,
            name: rawArea.name,
            centroidLatitude: Number(rawArea.centroidLatitude),
            centroidLongitude: Number(rawArea.centroidLongitude),
          }
        : null;

    return {
      id: row.id,
      positionId: row.position.id,
      reportsToPositionId: row.position.reportsToPositionId,
      roleCode: row.position.role.code,
      fullName: row.userProfile.fullName,
      organizationUnitName: row.position.organizationUnit.name,
      area,
      taskAssignmentId: row.taskAssignmentsReceived[0]?.id ?? null,
    };
  });

  const byReportsTo = new Map<string, AssignmentNode[]>();
  for (const assignment of assignments) {
    if (!assignment.reportsToPositionId) {
      continue;
    }
    const entries = byReportsTo.get(assignment.reportsToPositionId) ?? [];
    entries.push(assignment);
    byReportsTo.set(assignment.reportsToPositionId, entries);
  }

  return assignments
    .filter(
      (assignment) =>
        assignment.roleCode === RoleCode.OPERATIONAL_INTELLIGENCE_MANAGER,
    )
    .sort((left, right) =>
      left.organizationUnitName.localeCompare(right.organizationUnitName),
    )
    .map((operationalManager) => {
      const coordinators = (
        byReportsTo.get(operationalManager.positionId) ?? []
      )
        .filter(
          (assignment) => assignment.roleCode === RoleCode.FIELD_COORDINATOR,
        )
        .sort((left, right) =>
          left.organizationUnitName.localeCompare(right.organizationUnitName),
        );
      const primaryReports = coordinators
        .map((fieldCoordinator) => {
          const fieldOfficer = (
            byReportsTo.get(fieldCoordinator.positionId) ?? []
          )
            .filter(
              (assignment) =>
                assignment.roleCode === RoleCode.FIELD_OFFICER &&
                assignment.area !== null &&
                assignment.taskAssignmentId !== null,
            )
            .sort((left, right) =>
              (left.area?.officialCode ?? left.area?.name ?? '').localeCompare(
                right.area?.officialCode ?? right.area?.name ?? '',
              ),
            )[0];
          return fieldOfficer ? { fieldCoordinator, fieldOfficer } : null;
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

      if (primaryReports.length >= 2) {
        return { operationalManager, reports: primaryReports.slice(0, 2) };
      }

      const fallbackReports = coordinators.flatMap((fieldCoordinator) =>
        (byReportsTo.get(fieldCoordinator.positionId) ?? [])
          .filter(
            (assignment) =>
              assignment.roleCode === RoleCode.FIELD_OFFICER &&
              assignment.area !== null &&
              assignment.taskAssignmentId !== null,
          )
          .map((fieldOfficer) => ({ fieldCoordinator, fieldOfficer })),
      );

      return {
        operationalManager,
        reports: fallbackReports.slice(0, 2),
      };
    })
    .filter((chain) => chain.reports.length > 0);
}

async function upsertVerifiedBaket(params: {
  sequence: number;
  operationalManager: AssignmentNode;
  fieldCoordinator: AssignmentNode;
  fieldOfficer: AssignmentNode;
  clusterId: string;
  categoryId: string;
}) {
  const { sequence, operationalManager, fieldCoordinator, fieldOfficer } =
    params;
  const area = fieldOfficer.area;
  const taskAssignmentId = fieldOfficer.taskAssignmentId;
  if (!area || !taskAssignmentId) {
    throw new Error(
      'Seed report requires a scoped area and STR task assignment.',
    );
  }

  const seedKey = `${fieldOfficer.id}:${sequence}`;
  const jaringId = deterministicUuid(`seed-baket:jaring:${seedKey}`);
  const caretakerId = deterministicUuid(`seed-baket:caretaker:${seedKey}`);
  const coverageId = deterministicUuid(`seed-baket:jaring-coverage:${seedKey}`);
  const baketId = deterministicUuid(`seed-baket:baket:${seedKey}`);
  const versionId = deterministicUuid(`seed-baket:version:${seedKey}`);
  const verificationId = deterministicUuid(
    `seed-baket:verification:${seedKey}`,
  );
  const topic = reportTopics[sequence % reportTopics.length];
  const eventTime = addHours(seedBaseDate, sequence * 6);
  const completedAt = addHours(eventTime, 5);
  const coordinateOffset = ((sequence % 7) - 3) * 0.001;
  const latitude = area.centroidLatitude + coordinateOffset;
  const longitude = area.centroidLongitude - coordinateOffset;
  const areaCode = compactCode(area.officialCode ?? area.name).slice(0, 20);
  const jaringCode = `SEED-JARING-${areaCode}-${String(sequence + 1).padStart(3, '0')}`;
  const title = `${topic.title} di ${area.name}`;

  await prisma.$transaction(async (tx) => {
    await tx.jaring.upsert({
      where: { code: jaringCode },
      update: {
        aliasName: `Jaring ${area.name} ${String(sequence + 1).padStart(2, '0')}`,
        whatsappNumber: `+62870${String(sequence + 1).padStart(8, '0')}`,
        clusterId: params.clusterId,
        status: JaringStatus.ACTIVE,
        createdByAssignmentId: fieldOfficer.id,
        notes: `${SEED_TAG} Jaring sumber untuk laporan terverifikasi.`,
        deactivatedAt: null,
        deletedAt: null,
      },
      create: {
        id: jaringId,
        code: jaringCode,
        aliasName: `Jaring ${area.name} ${String(sequence + 1).padStart(2, '0')}`,
        whatsappNumber: `+62870${String(sequence + 1).padStart(8, '0')}`,
        clusterId: params.clusterId,
        status: JaringStatus.ACTIVE,
        createdByAssignmentId: fieldOfficer.id,
        notes: `${SEED_TAG} Jaring sumber untuk laporan terverifikasi.`,
        registeredAt: addHours(eventTime, -48),
      },
    });

    await tx.jaringCaretakerAssignment.upsert({
      where: { id: caretakerId },
      update: {
        jaringId,
        fieldOfficerAssignmentId: fieldOfficer.id,
        isActive: true,
        validUntil: null,
        transferReason: null,
      },
      create: {
        id: caretakerId,
        jaringId,
        fieldOfficerAssignmentId: fieldOfficer.id,
        isActive: true,
        validFrom: addHours(eventTime, -48),
      },
    });

    await tx.jaringAreaCoverage.upsert({
      where: { id: coverageId },
      update: {
        jaringId,
        areaId: area.id,
        isPrimary: true,
        validUntil: null,
      },
      create: {
        id: coverageId,
        jaringId,
        areaId: area.id,
        isPrimary: true,
        validFrom: addHours(eventTime, -48),
      },
    });

    await tx.baket.upsert({
      where: { id: baketId },
      update: {
        createdByFieldOfficerAssignmentId: fieldOfficer.id,
        taskAssignmentId,
        primaryJaringId: jaringId,
        reportCategoryId: params.categoryId,
        jaringClusterId: params.clusterId,
        status: BaketStatus.VERIFIED,
        currentVersionNumber: 1,
        deletedAt: null,
      },
      create: {
        id: baketId,
        createdByFieldOfficerAssignmentId: fieldOfficer.id,
        taskAssignmentId,
        primaryJaringId: jaringId,
        reportCategoryId: params.categoryId,
        jaringClusterId: params.clusterId,
        status: BaketStatus.VERIFIED,
        currentVersionNumber: 1,
        createdAt: eventTime,
      },
    });

    await tx.baketVersion.upsert({
      where: { id: versionId },
      update: {
        baketId,
        versionNumber: 1,
        title,
        originalContent: `${SEED_TAG}\nFakta: ${topic.finding}\nLokasi: ${area.name}.\nSumber memperoleh informasi melalui pemantauan langsung dan konfirmasi lapangan.`,
        normalizedContent: `Pada ${eventTime.toISOString()}, Field Officer melaporkan ${topic.finding.toLowerCase()} ${topic.implication}`,
        eventTime,
        eventAreaId: area.id,
        latitude,
        longitude,
        gpsAccuracyMeters: 12 + (sequence % 9),
        locationCapturedAt: eventTime,
        coordinateSource: CoordinateSource.DEVICE_GPS,
        areaResolutionMethod: AreaResolutionMethod.MANUAL_CONFIRMATION,
        areaResolutionConfidence: 98,
        areaResolvedAt: addHours(eventTime, 1),
        coverageValidationStatus: CoverageValidationStatus.WITHIN_SCOPE,
        coverageValidationNote: `${SEED_TAG} Area berada dalam scope Jaring dan Field Officer.`,
        coverageValidatedAt: addHours(eventTime, 1),
        urgency: sequence % 6 === 0 ? PriorityLevel.HIGH : PriorityLevel.NORMAL,
        fieldOfficerNote: `${SEED_TAG} Mohon verifikasi OIM dan korelasikan dengan perkembangan wilayah sekitar.`,
        createdByAssignmentId: fieldOfficer.id,
      },
      create: {
        id: versionId,
        baketId,
        versionNumber: 1,
        title,
        originalContent: `${SEED_TAG}\nFakta: ${topic.finding}\nLokasi: ${area.name}.\nSumber memperoleh informasi melalui pemantauan langsung dan konfirmasi lapangan.`,
        normalizedContent: `Pada ${eventTime.toISOString()}, Field Officer melaporkan ${topic.finding.toLowerCase()} ${topic.implication}`,
        eventTime,
        eventAreaId: area.id,
        latitude,
        longitude,
        gpsAccuracyMeters: 12 + (sequence % 9),
        locationCapturedAt: eventTime,
        coordinateSource: CoordinateSource.DEVICE_GPS,
        areaResolutionMethod: AreaResolutionMethod.MANUAL_CONFIRMATION,
        areaResolutionConfidence: 98,
        areaResolvedAt: addHours(eventTime, 1),
        coverageValidationStatus: CoverageValidationStatus.WITHIN_SCOPE,
        coverageValidationNote: `${SEED_TAG} Area berada dalam scope Jaring dan Field Officer.`,
        coverageValidatedAt: addHours(eventTime, 1),
        urgency: sequence % 6 === 0 ? PriorityLevel.HIGH : PriorityLevel.NORMAL,
        fieldOfficerNote: `${SEED_TAG} Mohon verifikasi OIM dan korelasikan dengan perkembangan wilayah sekitar.`,
        createdByAssignmentId: fieldOfficer.id,
        createdAt: eventTime,
      },
    });

    const coverageChecks = [
      { scopeType: CoverageScopeType.JARING, positionAssignmentId: null },
      {
        scopeType: CoverageScopeType.FIELD_OFFICER,
        positionAssignmentId: fieldOfficer.id,
      },
      {
        scopeType: CoverageScopeType.FIELD_COORDINATOR,
        positionAssignmentId: fieldCoordinator.id,
      },
      {
        scopeType: CoverageScopeType.ORGANIZATION_UNIT,
        positionAssignmentId: operationalManager.id,
      },
    ] as const;

    for (const check of coverageChecks) {
      const checkId = deterministicUuid(
        `seed-baket:coverage-check:${seedKey}:${check.scopeType}`,
      );
      await tx.baketCoverageCheck.upsert({
        where: { id: checkId },
        update: {
          baketVersionId: versionId,
          scopeType: check.scopeType,
          areaId: area.id,
          positionAssignmentId: check.positionAssignmentId,
          isWithinScope: true,
          note: `${SEED_TAG} Cakupan ${check.scopeType} tervalidasi.`,
          checkedAt: addHours(eventTime, 1),
        },
        create: {
          id: checkId,
          baketVersionId: versionId,
          scopeType: check.scopeType,
          areaId: area.id,
          positionAssignmentId: check.positionAssignmentId,
          isWithinScope: true,
          note: `${SEED_TAG} Cakupan ${check.scopeType} tervalidasi.`,
          checkedAt: addHours(eventTime, 1),
        },
      });
    }

    await tx.baketVerification.upsert({
      where: { baketVersionId: versionId },
      update: {
        verifiedByAssignmentId: operationalManager.id,
        status: VerificationStatus.VERIFIED,
        sourceReliability:
          sequence % 3 === 0 ? SourceReliability.A : SourceReliability.B,
        informationCredibility:
          sequence % 4 === 0
            ? InformationCredibility.ONE
            : InformationCredibility.TWO,
        summary: `${SEED_TAG} Informasi telah diperiksa, konsisten dengan penugasan, dan layak digunakan sebagai bahan analisis.`,
        startedAt: addHours(eventTime, 2),
        completedAt,
      },
      create: {
        id: verificationId,
        baketVersionId: versionId,
        verifiedByAssignmentId: operationalManager.id,
        status: VerificationStatus.VERIFIED,
        sourceReliability:
          sequence % 3 === 0 ? SourceReliability.A : SourceReliability.B,
        informationCredibility:
          sequence % 4 === 0
            ? InformationCredibility.ONE
            : InformationCredibility.TWO,
        summary: `${SEED_TAG} Informasi telah diperiksa, konsisten dengan penugasan, dan layak digunakan sebagai bahan analisis.`,
        startedAt: addHours(eventTime, 2),
        completedAt,
        createdAt: addHours(eventTime, 2),
      },
    });

    for (const [code, label, status] of verificationChecks) {
      await tx.baketVerificationCheck.upsert({
        where: {
          verificationId_code: { verificationId, code },
        },
        update: {
          label,
          status,
          note:
            status === VerificationCheckStatus.NOT_APPLICABLE
              ? `${SEED_TAG} Pemeriksaan tidak diwajibkan untuk laporan ini.`
              : `${SEED_TAG} Pemeriksaan memenuhi kriteria.`,
        },
        create: {
          id: deterministicUuid(
            `seed-baket:verification-check:${seedKey}:${code}`,
          ),
          verificationId,
          code,
          label,
          status,
          note:
            status === VerificationCheckStatus.NOT_APPLICABLE
              ? `${SEED_TAG} Pemeriksaan tidak diwajibkan untuk laporan ini.`
              : `${SEED_TAG} Pemeriksaan memenuhi kriteria.`,
        },
      });
    }
  });

  return baketId;
}

async function seedBaket() {
  const { clusters, categories } = await upsertMasterData();
  const chains = await loadSeedChains();
  if (chains.length === 0) {
    throw new Error(
      'No complete OIM -> Field Coordinator -> Field Officer chain found. Run seed-role-accounts and seed-str-hierarchy first.',
    );
  }

  const baketIds: string[] = [];
  let sequence = 0;
  for (const chain of chains) {
    for (const report of chain.reports) {
      baketIds.push(
        await upsertVerifiedBaket({
          sequence,
          operationalManager: chain.operationalManager,
          fieldCoordinator: report.fieldCoordinator,
          fieldOfficer: report.fieldOfficer,
          clusterId: clusters[sequence % clusters.length].id,
          categoryId: categories[sequence % categories.length].id,
        }),
      );
      sequence += 1;
    }
  }

  const [verifiedBakets, verifiedRecords, checklistItems] = await Promise.all([
    prisma.baket.count({
      where: { id: { in: baketIds }, status: BaketStatus.VERIFIED },
    }),
    prisma.baketVerification.count({
      where: {
        baketVersion: { baketId: { in: baketIds } },
        status: VerificationStatus.VERIFIED,
        completedAt: { not: null },
      },
    }),
    prisma.baketVerificationCheck.count({
      where: { verification: { baketVersion: { baketId: { in: baketIds } } } },
    }),
  ]);

  console.log('Seeded verified Baket baseline.');
  console.log(`- Jaring clusters: ${clusters.length}`);
  console.log(`- Report categories: ${categories.length}`);
  console.log(`- OIM chains covered: ${chains.length}`);
  console.log(`- Verified Bakets: ${verifiedBakets}`);
  console.log(`- Completed verifications: ${verifiedRecords}`);
  console.log(`- Verification checklist items: ${checklistItems}`);
}

void seedBaket()
  .catch((error: unknown) => {
    console.error('Failed to seed verified Baket data.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
