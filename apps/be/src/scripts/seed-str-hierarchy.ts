import {
  Classification,
  DirectiveStatus,
  PositionCode,
  PriorityLevel,
  RecipientStatus,
  RoleCode,
  TaskAssignmentStatus,
  TaskStatus,
  UukStrSectionType,
  UukStrStatus,
} from '../generated/prisma/client.js';
import { prisma } from '../modules/prisma/prisma.service.js';

const SEED_TAG = '[SEED_STR_HIERARCHY]';
const directiveBaseDate = new Date('2026-07-01T08:00:00.000Z');

type AssignmentNode = {
  id: string;
  email: string;
  fullName: string | null;
  positionId: string;
  positionCode: PositionCode;
  positionTitle: string;
  roleCode: RoleCode;
  organizationUnitId: string;
  organizationUnitCode: string;
  organizationUnitName: string;
  branch: 'DIRECTORATE' | 'BINDA' | null;
  reportsToPositionId: string | null;
  areaScopes: Array<{
    areaId: string;
    areaCode: string | null;
    areaName: string;
    isPrimary: boolean;
  }>;
};

type HierarchyChain = {
  regionalCommander: AssignmentNode;
  operationalManager: AssignmentNode;
  fieldCoordinators: Array<{
    coordinator: AssignmentNode;
    fieldOfficers: AssignmentNode[];
  }>;
};

type UukSectionSeed = {
  sectionType: UukStrSectionType;
  title: string;
  items: Array<{
    itemCode: string;
    content: string;
    orderNumber: number;
  }>;
};

type AssignmentStage = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';

function addDays(base: Date, days: number) {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

function titleCaseBranch(branch: 'DIRECTORATE' | 'BINDA' | null) {
  if (branch === 'DIRECTORATE') {
    return 'Direktorat';
  }

  if (branch === 'BINDA') {
    return 'Binda';
  }

  return 'Regional';
}

function compactCode(value: string) {
  return value.replace(/[^A-Z0-9]+/gi, '').toUpperCase();
}

function pickPrimaryArea(node: AssignmentNode) {
  return (
    node.areaScopes.find((area) => area.isPrimary) ?? node.areaScopes[0] ?? null
  );
}

function pickTaskPriority(index: number) {
  if (index % 7 === 0) {
    return PriorityLevel.URGENT;
  }

  if (index % 3 === 0) {
    return PriorityLevel.HIGH;
  }

  return PriorityLevel.NORMAL;
}

function pickTaskStage(index: number): AssignmentStage {
  const mod = index % 6;

  if (mod === 0 || mod === 3) {
    return 'COMPLETED';
  }

  if (mod === 1 || mod === 4) {
    return 'IN_PROGRESS';
  }

  return 'ASSIGNED';
}

function buildDirectiveSeed(
  chain: HierarchyChain,
  sequence: number,
  commandDate: Date,
) {
  const primaryArea = pickPrimaryArea(chain.regionalCommander);
  const branchLabel = titleCaseBranch(chain.regionalCommander.branch);
  const areaLabel =
    primaryArea?.areaName ?? chain.regionalCommander.organizationUnitName;
  const commandSuffix = String(sequence + 1).padStart(3, '0');

  return {
    commandNumber: `SEED/STR/${chain.regionalCommander.organizationUnitCode}/2026/${commandSuffix}`,
    strategicIssue: `${SEED_TAG} Penguatan operasi ${branchLabel.toLowerCase()} untuk ${areaLabel}.`,
    commandDescription: [
      `${SEED_TAG} Direktif ini menjadi sumber seed STR berjenjang.`,
      `Fokus operasi: ${areaLabel}.`,
      'Regional Commander wajib menjabarkan UUK/STR, OIM membentuk tugas, lalu Field Coordinator menurunkan penugasan ke Field Officer.',
    ].join('\n'),
    versionTitle: `STR Berjenjang ${branchLabel} ${areaLabel}`,
    commandSource: 'Deputi II DENS CAKRA',
    commandIssuer: 'Deputi II',
    classification:
      chain.regionalCommander.branch === 'BINDA'
        ? Classification.RAHASIA
        : Classification.TERBATAS,
    commandDate,
    dueDate: addDays(commandDate, 14),
  };
}

function buildUukSections(
  chain: HierarchyChain,
  directiveTitle: string,
  commandDate: Date,
): UukSectionSeed[] {
  const primaryArea = pickPrimaryArea(chain.regionalCommander);
  const areaLabel =
    primaryArea?.areaName ?? chain.regionalCommander.organizationUnitName;
  const branchLabel = titleCaseBranch(chain.regionalCommander.branch);
  const coordinatorNames = chain.fieldCoordinators
    .slice(0, 3)
    .map((item) => item.coordinator.fullName ?? item.coordinator.positionTitle)
    .join(', ');

  return [
    {
      sectionType: UukStrSectionType.BASIS_BACKGROUND,
      title: 'Dasar dan Latar Belakang',
      items: [
        {
          itemCode: '1',
          orderNumber: 1,
          content: `${SEED_TAG} STR ${directiveTitle} diterbitkan pada ${commandDate.toISOString()} untuk menjaga stabilitas operasi ${branchLabel.toLowerCase()} di ${areaLabel}.`,
        },
        {
          itemCode: '2',
          orderNumber: 2,
          content: `Regional command ${chain.regionalCommander.organizationUnitName} menindaklanjuti arahan dengan struktur berjenjang hingga unsur field officer.`,
        },
      ],
    },
    {
      sectionType: UukStrSectionType.INVESTIGATION_TARGETS,
      title: 'Sasaran Penyelidikan',
      items: [
        {
          itemCode: '1',
          orderNumber: 1,
          content: `Pemantauan area prioritas ${areaLabel} berikut simpul lapangan yang dikelola oleh ${coordinatorNames || 'field coordinator setempat'}.`,
        },
      ],
    },
    {
      sectionType: UukStrSectionType.EEI_PIR,
      title: 'EEI / PIR',
      items: [
        {
          itemCode: '1',
          orderNumber: 1,
          content:
            'Identifikasi perubahan situasi lapangan, aktor menonjol, dan indikator eskalasi cepat.',
        },
        {
          itemCode: '2',
          orderNumber: 2,
          content:
            'Laporkan kebutuhan klarifikasi yang memerlukan dukungan lintas sektor atau lintas wilayah.',
        },
      ],
    },
    {
      sectionType: UukStrSectionType.COLLECTION_PLAN,
      title: 'Rencana Pengumpulan',
      items: [
        {
          itemCode: '1',
          orderNumber: 1,
          content:
            'Field Coordinator membagi titik pantau ke Field Officer sesuai area scope aktif masing-masing.',
        },
        {
          itemCode: '2',
          orderNumber: 2,
          content:
            'Field Officer mengirim update awal, perkembangan lapangan, dan penutupan tugas secara bertahap.',
        },
      ],
    },
    {
      sectionType: UukStrSectionType.THREAT_RISK_ANALYSIS,
      title: 'Analisis Ancaman dan Risiko',
      items: [
        {
          itemCode: '1',
          orderNumber: 1,
          content: `Risiko utama adalah keterlambatan validasi area ${areaLabel} dan gap distribusi informasi antar unsur ${branchLabel.toLowerCase()}.`,
        },
      ],
    },
    {
      sectionType: UukStrSectionType.IMPLEMENTATION_MECHANISM,
      title: 'Mekanisme Pelaksanaan',
      items: [
        {
          itemCode: '1',
          orderNumber: 1,
          content: `${chain.operationalManager.positionTitle} bertindak sebagai OIM yang membentuk task operasional per field coordinator.`,
        },
        {
          itemCode: '2',
          orderNumber: 2,
          content:
            'Task diteruskan ke field officer secara berjenjang tanpa memutus relasi sumber STR dan area target.',
        },
      ],
    },
    {
      sectionType: UukStrSectionType.COORDINATION_REPORTING,
      title: 'Koordinasi dan Pelaporan',
      items: [
        {
          itemCode: '1',
          orderNumber: 1,
          content:
            'Setiap assignment wajib memiliki tenggat, catatan penugasan, dan status progres yang dapat ditelusuri.',
        },
      ],
    },
    {
      sectionType: UukStrSectionType.RECOMMENDATION,
      title: 'Rekomendasi',
      items: [
        {
          itemCode: '1',
          orderNumber: 1,
          content:
            'Prioritaskan area primer, pertahankan ritme update lapangan, dan eskalasi dini bila ada perubahan signifikan.',
        },
      ],
    },
    {
      sectionType: UukStrSectionType.AUTHENTICATION,
      title: 'Pengesahan',
      items: [
        {
          itemCode: '1',
          orderNumber: 1,
          content: `${SEED_TAG} Disahkan oleh ${chain.regionalCommander.fullName ?? chain.regionalCommander.positionTitle} untuk kebutuhan data demo berjenjang.`,
        },
      ],
    },
  ];
}

async function loadAssignments() {
  const rows = await prisma.userSeatAssignment.findMany({
    where: {
      isPrimary: true,
      isActive: true,
      validUntil: null,
      userProfile: {
        deletedAt: null,
        isActive: true,
      },
      position: {
        isActive: true,
        code: {
          in: [
            PositionCode.DEPUTI_II,
            PositionCode.DIREKTUR_WILAYAH,
            PositionCode.KABINDA,
            PositionCode.KASUBDIT,
            PositionCode.KABAGOPS,
            PositionCode.STAF_SUBDIT,
            PositionCode.KORWIL,
            PositionCode.PETUGAS_ORGANIK,
          ],
        },
      },
    },
    select: {
      id: true,
      userProfile: {
        select: {
          fullName: true,
          authUser: {
            select: {
              email: true,
            },
          },
        },
      },
      position: {
        select: {
          id: true,
          code: true,
          title: true,
          branch: true,
          reportsToPositionId: true,
          role: {
            select: {
              code: true,
            },
          },
          organizationUnit: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      },
      areaScopes: {
        where: {
          validUntil: null,
        },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        select: {
          isPrimary: true,
          area: {
            select: {
              id: true,
              officialCode: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return rows.map<AssignmentNode>((row) => ({
    id: row.id,
    email: row.userProfile.authUser.email,
    fullName: row.userProfile.fullName,
    positionId: row.position.id,
    positionCode: row.position.code,
    positionTitle: row.position.title,
    roleCode: row.position.role.code,
    organizationUnitId: row.position.organizationUnit.id,
    organizationUnitCode: row.position.organizationUnit.code,
    organizationUnitName: row.position.organizationUnit.name,
    branch: row.position.branch,
    reportsToPositionId: row.position.reportsToPositionId,
    areaScopes: row.areaScopes.map((scope) => ({
      areaId: scope.area.id,
      areaCode: scope.area.officialCode,
      areaName: scope.area.name,
      isPrimary: scope.isPrimary,
    })),
  }));
}

function buildChains(assignments: AssignmentNode[]) {
  const byReportsTo = new Map<string, AssignmentNode[]>();

  for (const assignment of assignments) {
    if (!assignment.reportsToPositionId) {
      continue;
    }

    const items = byReportsTo.get(assignment.reportsToPositionId) ?? [];
    items.push(assignment);
    byReportsTo.set(assignment.reportsToPositionId, items);
  }

  const executive = assignments.find(
    (assignment) => assignment.positionCode === PositionCode.DEPUTI_II,
  );

  if (!executive) {
    throw new Error(
      'Executive assignment not found. Run seed-role-accounts first.',
    );
  }

  const regionalCommanders = assignments
    .filter(
      (assignment) =>
        assignment.positionCode === PositionCode.DIREKTUR_WILAYAH ||
        assignment.positionCode === PositionCode.KABINDA,
    )
    .sort((left, right) =>
      left.organizationUnitCode.localeCompare(right.organizationUnitCode),
    );

  const chains: HierarchyChain[] = [];

  for (const regionalCommander of regionalCommanders) {
    const oim = (byReportsTo.get(regionalCommander.positionId) ?? []).find(
      (assignment) =>
        assignment.roleCode === RoleCode.OPERATIONAL_INTELLIGENCE_MANAGER,
    );

    if (!oim) {
      continue;
    }

    const coordinators = (byReportsTo.get(oim.positionId) ?? [])
      .filter(
        (assignment) => assignment.roleCode === RoleCode.FIELD_COORDINATOR,
      )
      .sort((left, right) =>
        (pickPrimaryArea(left)?.areaCode ?? left.positionTitle).localeCompare(
          pickPrimaryArea(right)?.areaCode ?? right.positionTitle,
        ),
      )
      .map((coordinator) => ({
        coordinator,
        fieldOfficers: (byReportsTo.get(coordinator.positionId) ?? [])
          .filter(
            (assignment) => assignment.roleCode === RoleCode.FIELD_OFFICER,
          )
          .sort((left, right) =>
            (
              pickPrimaryArea(left)?.areaCode ?? left.positionTitle
            ).localeCompare(
              pickPrimaryArea(right)?.areaCode ?? right.positionTitle,
            ),
          ),
      }))
      .filter((entry) => entry.fieldOfficers.length > 0);

    if (coordinators.length === 0) {
      continue;
    }

    chains.push({
      regionalCommander,
      operationalManager: oim,
      fieldCoordinators: coordinators,
    });
  }

  return {
    executive,
    chains,
  };
}

async function upsertDirective(
  executiveAssignmentId: string,
  chain: HierarchyChain,
  sequence: number,
) {
  const commandDate = addDays(directiveBaseDate, sequence);
  const seed = buildDirectiveSeed(chain, sequence, commandDate);
  const areaIds = Array.from(
    new Set(chain.regionalCommander.areaScopes.map((area) => area.areaId)),
  );

  const directive = await prisma.directive.upsert({
    where: {
      commandNumber: seed.commandNumber,
    },
    update: {
      ownerUnitId: chain.regionalCommander.reportsToPositionId
        ? (
            await prisma.position.findUniqueOrThrow({
              where: { id: chain.regionalCommander.reportsToPositionId },
              select: { organizationUnitId: true },
            })
          ).organizationUnitId
        : chain.regionalCommander.organizationUnitId,
      createdByAssignmentId: executiveAssignmentId,
      status: DirectiveStatus.DISTRIBUTED,
      currentVersionNumber: 1,
      deletedAt: null,
    },
    create: {
      commandNumber: seed.commandNumber,
      ownerUnitId: chain.regionalCommander.reportsToPositionId
        ? (
            await prisma.position.findUniqueOrThrow({
              where: { id: chain.regionalCommander.reportsToPositionId },
              select: { organizationUnitId: true },
            })
          ).organizationUnitId
        : chain.regionalCommander.organizationUnitId,
      createdByAssignmentId: executiveAssignmentId,
      status: DirectiveStatus.DISTRIBUTED,
    },
  });

  const version = await prisma.directiveVersion.upsert({
    where: {
      directiveId_versionNumber: {
        directiveId: directive.id,
        versionNumber: 1,
      },
    },
    update: {
      classification: seed.classification,
      commandSource: seed.commandSource,
      commandIssuer: seed.commandIssuer,
      commandDate: seed.commandDate,
      dueDate: seed.dueDate,
      strategicIssue: seed.strategicIssue,
      commandDescription: seed.commandDescription,
      createdByAssignmentId: executiveAssignmentId,
      changeReason: `${SEED_TAG} refresh`,
    },
    create: {
      directiveId: directive.id,
      versionNumber: 1,
      classification: seed.classification,
      commandSource: seed.commandSource,
      commandIssuer: seed.commandIssuer,
      commandDate: seed.commandDate,
      dueDate: seed.dueDate,
      strategicIssue: seed.strategicIssue,
      commandDescription: seed.commandDescription,
      createdByAssignmentId: executiveAssignmentId,
      changeReason: `${SEED_TAG} initial`,
    },
  });

  await prisma.directiveTargetArea.deleteMany({
    where: {
      directiveVersionId: version.id,
      areaId: {
        notIn: areaIds,
      },
    },
  });

  for (const [index, areaId] of areaIds.entries()) {
    await prisma.directiveTargetArea.upsert({
      where: {
        directiveVersionId_areaId: {
          directiveVersionId: version.id,
          areaId,
        },
      },
      update: {
        isPrimary: index === 0,
      },
      create: {
        directiveVersionId: version.id,
        areaId,
        isPrimary: index === 0,
      },
    });
  }

  const existingRecipient = await prisma.directiveRecipient.findFirst({
    where: {
      directiveVersionId: version.id,
      targetPositionId: chain.regionalCommander.positionId,
    },
    select: {
      id: true,
    },
  });

  const recipientData = {
    directiveVersionId: version.id,
    targetUnitId: null,
    targetPositionId: chain.regionalCommander.positionId,
    status: RecipientStatus.ACKNOWLEDGED,
    deliveredAt: addDays(seed.commandDate, 1),
    readAt: addDays(seed.commandDate, 1),
    acknowledgedAt: addDays(seed.commandDate, 1),
    failureReason: null,
  } as const;

  if (existingRecipient) {
    await prisma.directiveRecipient.update({
      where: { id: existingRecipient.id },
      data: recipientData,
    });
  } else {
    await prisma.directiveRecipient.create({
      data: {
        ...recipientData,
        sentAt: seed.commandDate,
      },
    });
  }

  return {
    directive,
    version,
    directiveSeed: seed,
  };
}

async function upsertUukStr(
  chain: HierarchyChain,
  directiveVersionId: string,
  versionTitle: string,
  commandDate: Date,
) {
  const existing = await prisma.uukStr.findFirst({
    where: {
      directiveVersionId,
      ownerUnitId: chain.regionalCommander.organizationUnitId,
      createdByAssignmentId: chain.regionalCommander.id,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  const uuk = existing
    ? await prisma.uukStr.update({
        where: { id: existing.id },
        data: {
          status: UukStrStatus.PUBLISHED,
          currentVersionNumber: 1,
          createdByAssignmentId: chain.regionalCommander.id,
          deletedAt: null,
        },
      })
    : await prisma.uukStr.create({
        data: {
          directiveVersionId,
          ownerUnitId: chain.regionalCommander.organizationUnitId,
          createdByAssignmentId: chain.regionalCommander.id,
          status: UukStrStatus.PUBLISHED,
          currentVersionNumber: 1,
        },
      });

  const version = await prisma.uukStrVersion.upsert({
    where: {
      uukStrId_versionNumber: {
        uukStrId: uuk.id,
        versionNumber: 1,
      },
    },
    update: {
      title: versionTitle,
      createdByAssignmentId: chain.regionalCommander.id,
      changeReason: `${SEED_TAG} refresh`,
    },
    create: {
      uukStrId: uuk.id,
      versionNumber: 1,
      title: versionTitle,
      createdByAssignmentId: chain.regionalCommander.id,
      changeReason: `${SEED_TAG} initial`,
    },
  });

  await prisma.uukStrSection.deleteMany({
    where: {
      uukStrVersionId: version.id,
    },
  });

  const sections = buildUukSections(chain, versionTitle, commandDate);

  for (const [sectionIndex, section] of sections.entries()) {
    await prisma.uukStrSection.create({
      data: {
        uukStrVersionId: version.id,
        sectionType: section.sectionType,
        title: section.title,
        orderNumber: sectionIndex + 1,
        items: {
          create: section.items.map((item) => ({
            itemCode: item.itemCode,
            content: item.content,
            orderNumber: item.orderNumber,
          })),
        },
      },
    });
  }

  return {
    uuk,
    version,
  };
}

async function upsertTask(
  chain: HierarchyChain,
  coordinator: AssignmentNode,
  fieldOfficers: AssignmentNode[],
  directiveVersionId: string,
  uukStrVersionId: string,
  sequence: number,
) {
  const primaryArea =
    pickPrimaryArea(coordinator) ?? pickPrimaryArea(chain.regionalCommander);

  if (!primaryArea) {
    throw new Error(
      `Primary area missing for coordinator ${coordinator.positionTitle}.`,
    );
  }

  const title = `${SEED_TAG} Tugas Lapangan ${primaryArea.areaName} ${compactCode(coordinator.organizationUnitCode)}`;
  const description = [
    `${SEED_TAG} Task turunan OIM untuk ${coordinator.fullName ?? coordinator.positionTitle}.`,
    `Sumber: ${chain.regionalCommander.organizationUnitName}.`,
    `Distribusi Field Officer: ${fieldOfficers.length} personel.`,
  ].join('\n');
  const dueDate = addDays(directiveBaseDate, 10 + (sequence % 7));
  const stage = pickTaskStage(sequence);
  const priority = pickTaskPriority(sequence);
  const areaIds = Array.from(
    new Set(coordinator.areaScopes.map((area) => area.areaId)),
  );

  const existing = await prisma.task.findFirst({
    where: {
      ownerUnitId: chain.operationalManager.organizationUnitId,
      uukStrVersionId,
      title,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  const task = existing
    ? await prisma.task.update({
        where: { id: existing.id },
        data: {
          directiveVersionId,
          uukStrVersionId,
          ownerUnitId: chain.operationalManager.organizationUnitId,
          createdByAssignmentId: chain.operationalManager.id,
          title,
          description,
          priority,
          dueDate,
          status:
            stage === 'COMPLETED'
              ? TaskStatus.COMPLETED
              : stage === 'IN_PROGRESS'
                ? TaskStatus.IN_PROGRESS
                : TaskStatus.ASSIGNED,
          deletedAt: null,
        },
      })
    : await prisma.task.create({
        data: {
          directiveVersionId,
          uukStrVersionId,
          ownerUnitId: chain.operationalManager.organizationUnitId,
          createdByAssignmentId: chain.operationalManager.id,
          title,
          description,
          priority,
          dueDate,
          status:
            stage === 'COMPLETED'
              ? TaskStatus.COMPLETED
              : stage === 'IN_PROGRESS'
                ? TaskStatus.IN_PROGRESS
                : TaskStatus.ASSIGNED,
        },
      });

  await prisma.taskTargetArea.deleteMany({
    where: {
      taskId: task.id,
      areaId: {
        notIn: areaIds,
      },
    },
  });

  for (const [index, areaId] of areaIds.entries()) {
    await prisma.taskTargetArea.upsert({
      where: {
        taskId_areaId: {
          taskId: task.id,
          areaId,
        },
      },
      update: {
        isPrimary: index === 0,
      },
      create: {
        taskId: task.id,
        areaId,
        isPrimary: index === 0,
      },
    });
  }

  await upsertTaskAssignment({
    taskId: task.id,
    assignerAssignmentId: chain.operationalManager.id,
    assigneeAssignmentId: coordinator.id,
    status:
      stage === 'COMPLETED'
        ? TaskAssignmentStatus.COMPLETED
        : stage === 'IN_PROGRESS'
          ? TaskAssignmentStatus.IN_PROGRESS
          : TaskAssignmentStatus.ACKNOWLEDGED,
    dueDate,
    assignmentNote: `${SEED_TAG} Distribusi OIM ke Field Coordinator.`,
  });

  for (const [index, fieldOfficer] of fieldOfficers.entries()) {
    const officerStage =
      stage === 'COMPLETED'
        ? TaskAssignmentStatus.COMPLETED
        : stage === 'IN_PROGRESS'
          ? index === 0
            ? TaskAssignmentStatus.IN_PROGRESS
            : TaskAssignmentStatus.ACKNOWLEDGED
          : TaskAssignmentStatus.SENT;

    await upsertTaskAssignment({
      taskId: task.id,
      assignerAssignmentId: coordinator.id,
      assigneeAssignmentId: fieldOfficer.id,
      status: officerStage,
      dueDate: addDays(dueDate, -(index % 2)),
      assignmentNote: `${SEED_TAG} Distribusi FC ke Field Officer ${index + 1}.`,
    });
  }

  return task;
}

async function upsertTaskAssignment(params: {
  taskId: string;
  assignerAssignmentId: string;
  assigneeAssignmentId: string;
  status: TaskAssignmentStatus;
  dueDate: Date;
  assignmentNote: string;
}) {
  const existing = await prisma.taskAssignment.findFirst({
    where: {
      taskId: params.taskId,
      assignerAssignmentId: params.assignerAssignmentId,
      assigneeAssignmentId: params.assigneeAssignmentId,
      assignmentNote: params.assignmentNote,
    },
    select: {
      id: true,
    },
  });

  const now = params.dueDate;
  const statusDates =
    params.status === TaskAssignmentStatus.COMPLETED
      ? {
          readAt: addDays(now, -6),
          acknowledgedAt: addDays(now, -5),
          startedAt: addDays(now, -4),
          completedAt: addDays(now, -1),
        }
      : params.status === TaskAssignmentStatus.IN_PROGRESS
        ? {
            readAt: addDays(now, -4),
            acknowledgedAt: addDays(now, -3),
            startedAt: addDays(now, -2),
            completedAt: null,
          }
        : params.status === TaskAssignmentStatus.ACKNOWLEDGED
          ? {
              readAt: addDays(now, -2),
              acknowledgedAt: addDays(now, -1),
              startedAt: null,
              completedAt: null,
            }
          : {
              readAt: null,
              acknowledgedAt: null,
              startedAt: null,
              completedAt: null,
            };

  const assignment = existing
    ? await prisma.taskAssignment.update({
        where: { id: existing.id },
        data: {
          status: params.status,
          dueDate: params.dueDate,
          assignmentNote: params.assignmentNote,
          ...statusDates,
        },
      })
    : await prisma.taskAssignment.create({
        data: {
          taskId: params.taskId,
          assignerAssignmentId: params.assignerAssignmentId,
          assigneeAssignmentId: params.assigneeAssignmentId,
          status: params.status,
          dueDate: params.dueDate,
          assignmentNote: params.assignmentNote,
          ...statusDates,
        },
      });

  await prisma.taskProgressLog.deleteMany({
    where: {
      taskAssignmentId: assignment.id,
    },
  });

  const progressSteps: Array<{
    status: TaskAssignmentStatus;
    progressPercent: number | null;
    offsetDays: number;
  }> = [];

  if (params.status !== TaskAssignmentStatus.SENT) {
    progressSteps.push({
      status: TaskAssignmentStatus.READ,
      progressPercent: null,
      offsetDays: -4,
    });
  }

  if (
    params.status === TaskAssignmentStatus.ACKNOWLEDGED ||
    params.status === TaskAssignmentStatus.IN_PROGRESS ||
    params.status === TaskAssignmentStatus.COMPLETED
  ) {
    progressSteps.push({
      status: TaskAssignmentStatus.ACKNOWLEDGED,
      progressPercent: null,
      offsetDays: -3,
    });
  }

  if (
    params.status === TaskAssignmentStatus.IN_PROGRESS ||
    params.status === TaskAssignmentStatus.COMPLETED
  ) {
    progressSteps.push({
      status: TaskAssignmentStatus.IN_PROGRESS,
      progressPercent:
        params.status === TaskAssignmentStatus.COMPLETED ? 80 : 55,
      offsetDays: -2,
    });
  }

  if (params.status === TaskAssignmentStatus.COMPLETED) {
    progressSteps.push({
      status: TaskAssignmentStatus.COMPLETED,
      progressPercent: 100,
      offsetDays: -1,
    });
  }

  for (const step of progressSteps) {
    await prisma.taskProgressLog.create({
      data: {
        taskAssignmentId: assignment.id,
        status: step.status,
        progressPercent: step.progressPercent,
        note: `${SEED_TAG} ${step.status}`,
        createdByAssignmentId: params.assigneeAssignmentId,
        createdAt: addDays(params.dueDate, step.offsetDays),
      },
    });
  }

  return assignment;
}

async function seedStrHierarchy() {
  const assignments = await loadAssignments();
  const { executive, chains } = buildChains(assignments);

  let directiveCount = 0;
  let uukCount = 0;
  let taskCount = 0;
  let coordinatorAssignmentCount = 0;
  let officerAssignmentCount = 0;

  for (const [chainIndex, chain] of chains.entries()) {
    const { version: directiveVersion, directiveSeed } = await upsertDirective(
      executive.id,
      chain,
      chainIndex,
    );
    directiveCount += 1;

    const { version: uukVersion } = await upsertUukStr(
      chain,
      directiveVersion.id,
      directiveSeed.versionTitle,
      directiveSeed.commandDate,
    );
    uukCount += 1;

    for (const [coordinatorIndex, item] of chain.fieldCoordinators.entries()) {
      await upsertTask(
        chain,
        item.coordinator,
        item.fieldOfficers,
        directiveVersion.id,
        uukVersion.id,
        chainIndex * 1000 + coordinatorIndex,
      );
      taskCount += 1;
      coordinatorAssignmentCount += 1;
      officerAssignmentCount += item.fieldOfficers.length;
    }
  }

  console.log('Seeded STR hierarchy baseline.');
  console.log(`- directives: ${directiveCount}`);
  console.log(`- uuk/strs: ${uukCount}`);
  console.log(`- tasks: ${taskCount}`);
  console.log(
    `- OIM -> Field Coordinator assignments: ${coordinatorAssignmentCount}`,
  );
  console.log(
    `- Field Coordinator -> Field Officer assignments: ${officerAssignmentCount}`,
  );
}

void seedStrHierarchy()
  .catch((error: unknown) => {
    console.error('Failed to seed STR hierarchy.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
