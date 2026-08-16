import "server-only";

import type { PagedResponse } from "@/lib/api/types";
import { sortReportCategories } from "@/lib/domain/report-category-order";
import { backendApi } from "@/server/backend-api";

import type {
  AccessContext,
  FieldOfficerBaket,
  FieldOfficerIncoming,
  FieldOfficerJaring,
  FieldOfficerTask,
  FieldOfficerWorkspace,
  JaringInstructionDispatch,
  JaringOccupation,
  ReportCategory,
  WhatsappControlChannel,
} from "./types";

type AccessMeResponse = {
  user?: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
  authorizationContext?: AccessContext | null;
};

type JaringRecord = {
  id: string;
  aliasName: string;
  whatsappNumber: string;
  status: string;
  registrationStatus?: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
  reviewedAt?: string | Date | null;
  notes?: string | null;
  areaCoverages?: Array<{
    areaId: string;
    area?: {
      id: string;
      name: string;
    } | null;
  }>;
  caretakerAssignments?: Array<{
    fieldOfficerAssignment?: {
      id: string;
    } | null;
  }>;
  _count?: {
    messages?: number;
    primaryBakets?: number;
  };
  fullName?: string | null;
  nationalIdNumber?: string | null;
  address?: string | null;
  birthPlace?: string | null;
  birthDate?: string | Date | null;
  gender?: string | null;
  occupation?: {
    id: string;
    name: string;
  } | null;
  profilePhotoFileId?: string | null;
  profilePhotoFile?: {
    id: string;
  } | null;
  workplace?: string | null;
  jobTitle?: string | null;
  joinedAt?: string | Date | null;
  organizationName?: string | null;
  politicalAffiliation?: string | null;
};

type AreaScopeRecord = {
  areaId: string;
  code: string;
  officialCode?: string | null;
  name: string;
  level: string;
  parentAreaId?: string | null;
  parentOfficialCode?: string | null;
};

type MessageRecord = {
  id: string;
  referenceNumber?: string | null;
  senderPhone: string;
  content?: string | null;
  status: string;
  validationSummary: string;
  categoryId?: string | null;
  category?: {
    id: string;
    name: string;
  } | null;
  convertedBaket?: {
    reportCategory?: {
      id: string;
      name: string;
    } | null;
    versions?: Array<{
      urgency?: string | null;
    }>;
  } | null;
  jaring?: {
    id: string;
    aliasName?: string | null;
  } | null;
  receivedAt: string;
  locationCapturedAt?: string | null;
  processedAt?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  gpsAccuracyMeters?: string | number | null;
  rawPayload?: unknown;
  resolvedArea?: {
    name?: string | null;
  } | null;
  media?: Array<{
    fileId?: string | null;
    caption?: string | null;
    file?: {
      id?: string | null;
      mimeType?: string | null;
      originalName?: string | null;
    } | null;
  }>;
  reportAmendments?: Array<{
    id: string;
    versionNumber: number;
    amendmentType: string;
    content?: string | null;
    createdAt: string;
  }>;
};

type JaringReportSessionRecord = {
  id: string;
  jaringId: string;
  referenceNumber?: string | null;
  displayTitle: string;
  content?: string | null;
  status: string;
  reportedAt: string;
  submittedAt?: string | null;
  location?: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number | null;
    capturedAt?: string | null;
  } | null;
  reportCategory?: { id: string; name: string } | null;
  media?: Array<{
    id: string;
    fileId: string;
    caption?: string | null;
    fileName?: string | null;
    mimeType?: string | null;
  }>;
};

type TaskRecord = {
  id: string;
  title: string;
  description: string;
  priority: string;
  dueDate?: string | null;
  status: string;
  directiveVersion?: {
    classification?: string | null;
    commandSource?: string | null;
    directive?: {
      commandNumber?: string | null;
    } | null;
  } | null;
  uukStrVersion?: {
    classification?: string | null;
    title?: string | null;
    uukStr?: {
      directiveVersion?: {
        commandSource?: string | null;
        directive?: {
          commandNumber?: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
  targetAreas?: Array<{
    area?: {
      name?: string | null;
    } | null;
  }>;
  assignments?: Array<{
    id: string;
    status: string;
    dueDate?: string | null;
    assignmentNote?: string | null;
    progressPercent?: number | null;
    assigneeAssignmentId: string;
    assigner?: {
      userProfile?: {
        fullName?: string | null;
      } | null;
      position?: {
        title?: string | null;
      } | null;
    } | null;
  }>;
};

type PositionRecord = {
  title?: string | null;
  code?: string | null;
  role?: {
    code?: string | null;
  } | null;
  reportsTo?: PositionRecord | null;
};

type BaketRecord = {
  id: string;
  status: string;
  createdAt: string;
  primaryJaringId?: string | null;
  reportCategory?: { name: string } | null;
  createdByFieldOfficerAssignment?: {
    position?: PositionRecord | null;
  } | null;
  taskAssignment?: {
    assigner?: {
      position?: {
        title?: string | null;
      } | null;
    } | null;
  } | null;
  versions?: Array<{
    id: string;
    originalContent: string;
    createdAt: string;
    fieldOfficerNote?: string | null;
    urgency?: string | null;
  }>;
};

type LocationRecord = {
  id: string;
  latitude: string | number;
  longitude: string | number;
  capturedAt: string;
  gpsAccuracyMeters?: string | number | null;
  area?: {
    name?: string | null;
  } | null;
};

function asNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asIsoString(value: string | Date | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.toISOString();
}

function deriveDisplayTitle(content?: string | null, fallback = "Laporan sedang dibuat") {
  const words = content?.replace(/\s+/g, " ").trim().split(" ").filter(Boolean) ?? [];
  if (!words.length) return fallback;
  return `${words.slice(0, 6).join(" ")}${words.length > 6 ? "…" : ""}`;
}

function oimPositionTitleFrom(position?: PositionRecord | null) {
  let current = position ?? null;
  let depth = 0;

  while (current && depth < 6) {
    const roleCode = current.role?.code?.toUpperCase();
    const positionCode = current.code?.toUpperCase();

    if (positionCode === "KABAGOPS" || positionCode === "KASUBDIT") {
      return current.title ?? null;
    }

    current = current.reportsTo ?? null;
    depth += 1;
  }

  return null;
}

async function getAccess(cookie: string) {
  const access = await backendApi<AccessMeResponse>("/access/me", { cookie });

  if (!access.authorizationContext) {
    throw new Error("Akses domain pengguna belum tersedia.");
  }

  return {
    context: access.authorizationContext,
    profile: {
      name: access.user?.name ?? "Pengguna DENS CAKRA",
      email: access.user?.email ?? "-",
      role: access.user?.role ?? access.authorizationContext.authRole,
    },
  };
}

function mapTask(record: TaskRecord, assignmentId: string): FieldOfficerTask | null {
  const assignment = record.assignments?.find((item) => item.assigneeAssignmentId === assignmentId);

  if (!assignment) {
    return null;
  }

  const sourceLabel =
    record.uukStrVersion?.title ??
    record.uukStrVersion?.uukStr?.directiveVersion?.directive?.commandNumber ??
    record.directiveVersion?.directive?.commandNumber ??
    record.uukStrVersion?.uukStr?.directiveVersion?.commandSource ??
    record.directiveVersion?.commandSource ??
    null;

  const classification = record.directiveVersion?.classification ?? record.uukStrVersion?.classification ?? null;

  return {
    assignmentId: assignment.id,
    taskId: record.id,
    title: record.title,
    description: record.description,
    coordinatorInstruction: assignment.assignmentNote?.trim() ?? null,
    priority: record.priority,
    dueDate: assignment.dueDate ?? record.dueDate ?? null,
    taskStatus: record.status,
    assignmentStatus: assignment.status,
    sourceLabel,
    targetAreas: (record.targetAreas ?? []).map((item) => item.area?.name).filter(Boolean) as string[],
    assignerName: assignment.assigner?.userProfile?.fullName ?? null,
    assignerPositionTitle: assignment.assigner?.position?.title ?? null,
    progressSummary:
      assignment.progressPercent !== null && assignment.progressPercent !== undefined
        ? `${assignment.progressPercent}%`
        : assignment.status,
    classification,
  };
}

function mapIncoming(record: MessageRecord, jaring: FieldOfficerJaring): FieldOfficerIncoming {
  const rawPayload = asRecord(record.rawPayload);
  const photoMessageId = asString(rawPayload?.photoMessageId);
  const photoCaption = asString(rawPayload?.photoCaption);
  const evidenceFiles = (record.media ?? []).flatMap((item) => {
    const fileId = item.fileId ?? item.file?.id ?? null;
    return fileId
      ? [
          {
            fileId,
            url: `/api/field-officer/files/${fileId}`,
            caption: item.caption ?? null,
            mimeType: item.file?.mimeType ?? null,
            originalName: item.file?.originalName ?? null,
          },
        ]
      : [];
  });
  const photoFileId =
    evidenceFiles[0]?.fileId ??
    record.media?.find((item) => item.fileId || item.file?.id)?.fileId ??
    record.media?.find((item) => item.file?.id)?.file?.id ??
    null;

  return {
    id: record.id,
    referenceNumber: record.referenceNumber ?? asString(rawPayload?.referenceNumber),
    jaringId: jaring.id,
    jaringCode: jaring.aliasName ?? jaring.id,
    jaringAlias: jaring.aliasName ?? jaring.id,
    senderPhone: record.senderPhone,
    displayTitle: deriveDisplayTitle(record.content),
    content: record.content ?? null,
    contentAmendments: (record.reportAmendments ?? [])
      .filter((amendment) => amendment.amendmentType === "CONTENT_ADDITION" && Boolean(amendment.content))
      .map((amendment) => ({
        id: amendment.id,
        versionNumber: amendment.versionNumber,
        content: amendment.content as string,
        createdAt: amendment.createdAt,
      })),
    status: record.status,
    validationSummary: record.validationSummary,
    categoryId: record.categoryId ?? record.category?.id ?? record.convertedBaket?.reportCategory?.id ?? null,
    categoryName: record.category?.name ?? record.convertedBaket?.reportCategory?.name ?? null,
    urgency: record.convertedBaket?.versions?.[0]?.urgency ?? null,
    receivedAt: record.receivedAt,
    reportedAt: record.receivedAt,
    gpsSharedAt: asString(rawPayload?.gpsSharedAt) ?? record.locationCapturedAt ?? null,
    processedAt: record.processedAt ?? null,
    reportTimestamp: asString(rawPayload?.timestamp) ?? record.processedAt ?? record.receivedAt,
    areaName: record.resolvedArea?.name ?? null,
    latitude: asNumber(record.latitude),
    longitude: asNumber(record.longitude),
    gpsAccuracyMeters: asNumber(record.gpsAccuracyMeters),
    mediaCount: evidenceFiles.length,
    evidenceFiles,
    hasPhoto: Boolean(record.media?.length ?? photoMessageId),
    photoCaption,
    photoMessageId,
    photoFileId,
    photoUrl: photoFileId ? `/api/field-officer/files/${photoFileId}` : null,
  };
}

function mapDraftReport(report: JaringReportSessionRecord, jaring: FieldOfficerJaring): FieldOfficerIncoming {
  const evidenceFiles = (report.media ?? []).map((item) => ({
    fileId: item.fileId,
    url: `/api/field-officer/files/${item.fileId}`,
    caption: item.caption ?? null,
    mimeType: item.mimeType ?? null,
    originalName: item.fileName ?? null,
  }));
  const firstFile = evidenceFiles[0] ?? null;
  return {
    id: report.id,
    referenceNumber: report.referenceNumber ?? null,
    jaringId: report.jaringId,
    jaringCode: jaring.aliasName ?? jaring.id,
    jaringAlias: jaring.aliasName,
    senderPhone: jaring.whatsappNumber,
    displayTitle: report.displayTitle,
    content: report.content ?? null,
    contentAmendments: [],
    status: report.status,
    validationSummary: "NOT_CHECKED",
    categoryId: report.reportCategory?.id ?? null,
    categoryName: report.reportCategory?.name ?? null,
    urgency: null,
    receivedAt: report.reportedAt,
    reportedAt: report.reportedAt,
    gpsSharedAt: report.location?.capturedAt ?? null,
    processedAt: report.submittedAt ?? null,
    reportTimestamp: report.reportedAt,
    areaName: null,
    latitude: report.location?.latitude ?? null,
    longitude: report.location?.longitude ?? null,
    gpsAccuracyMeters: report.location?.accuracyMeters ?? null,
    mediaCount: evidenceFiles.length,
    evidenceFiles,
    hasPhoto: evidenceFiles.length > 0,
    photoCaption: firstFile?.caption ?? null,
    photoMessageId: null,
    photoFileId: firstFile?.fileId ?? null,
    photoUrl: firstFile?.url ?? null,
  };
}

function mapJaringRecord(item: JaringRecord): FieldOfficerJaring {
  return {
    id: item.id,
    code: item.aliasName || item.id,
    aliasName: item.aliasName,
    whatsappNumber: item.whatsappNumber,
    status: item.registrationStatus === "APPROVED" ? item.status : "INACTIVE",
    lastReportAt: (item as unknown as { lastReportAt?: string | null }).lastReportAt ?? null,
    registrationStatus: item.registrationStatus ?? "APPROVED",
    rejectionReason: item.rejectionReason ?? null,
    reviewedAt: asIsoString(item.reviewedAt),
    notes: item.notes ?? null,
    areaNames: (item.areaCoverages ?? []).map((coverage) => coverage.area?.name).filter(Boolean) as string[],
    areaIds: (item.areaCoverages ?? []).map((coverage) => coverage.areaId),
    messageCount: item._count?.messages ?? 0,
    baketCount: item._count?.primaryBakets ?? 0,
    fullName: item.fullName ?? null,
    nationalIdNumber: item.nationalIdNumber ?? null,
    address: item.address ?? null,
    birthPlace: item.birthPlace ?? null,
    birthDate: asIsoString(item.birthDate),
    gender: item.gender ?? null,
    occupationName: item.occupation?.name ?? null,
    profilePhotoFileId: item.profilePhotoFileId ?? item.profilePhotoFile?.id ?? null,
    profilePhotoUrl:
      item.profilePhotoFileId || item.profilePhotoFile?.id
        ? `/api/field-officer/files/${item.profilePhotoFileId ?? item.profilePhotoFile?.id}`
        : null,
    workplace: item.workplace ?? null,
    jobTitle: item.jobTitle ?? null,
    joinedAt: asIsoString(item.joinedAt),
    organizationName: item.organizationName ?? null,
    politicalAffiliation: item.politicalAffiliation ?? null,
  };
}

function emptyWorkspace(access: Awaited<ReturnType<typeof getAccess>>): FieldOfficerWorkspace {
  return {
    context: access.context,
    profile: access.profile,
    jaring: [],
    occupations: [],
    districtAreas: [],
    villageAreas: [],
    reportCategories: [],
    jaringReports: [],
    incoming: [],
    baketCandidates: [],
    tasks: [],
    bakets: [],
    latestLocation: null,
  };
}

function ownJaring(records: JaringRecord[], assignmentId: string) {
  return records
    .filter((item) =>
      (item.caretakerAssignments ?? []).some((caretaker) => caretaker.fieldOfficerAssignment?.id === assignmentId),
    )
    .map(mapJaringRecord);
}

function messageJaring(record: MessageRecord): FieldOfficerJaring | null {
  if (!record.jaring?.id) return null;
  return {
    id: record.jaring.id,
    code: record.jaring.aliasName ?? record.jaring.id,
    aliasName: record.jaring.aliasName ?? record.jaring.id,
    whatsappNumber: record.senderPhone,
    status: "ACTIVE",
    lastReportAt: record.receivedAt,
    registrationStatus: "APPROVED",
    rejectionReason: null,
    reviewedAt: null,
    notes: null,
    areaNames: [],
    areaIds: [],
    messageCount: 0,
    baketCount: 0,
    fullName: null,
    nationalIdNumber: null,
    address: null,
    birthPlace: null,
    birthDate: null,
    gender: null,
    occupationName: null,
    profilePhotoFileId: null,
    profilePhotoUrl: null,
    workplace: null,
    jobTitle: null,
    joinedAt: null,
    organizationName: null,
    politicalAffiliation: null,
  };
}

function mapCategories(categories: Array<ReportCategory & { _count?: { whatsAppMessages?: number } }>) {
  return sortReportCategories(categories).map((category) => ({
    id: category.id,
    code: category.code,
    name: category.name,
    description: category.description ?? null,
    isActive: category.isActive,
    messageCount: category._count?.whatsAppMessages ?? category.messageCount,
  }));
}

function mapBakets(items: BaketRecord[], jaringIndex: Map<string, FieldOfficerJaring>) {
  return items.map<FieldOfficerBaket>((item) => ({
    id: item.id,
    status: item.status,
    createdAt: item.createdAt,
    primaryJaringId: item.primaryJaringId ?? null,
    primaryJaringCode: item.primaryJaringId
      ? (jaringIndex.get(item.primaryJaringId)?.aliasName ?? item.primaryJaringId)
      : null,
    primaryJaringAlias: item.primaryJaringId ? (jaringIndex.get(item.primaryJaringId)?.aliasName ?? null) : null,
    currentVersionId: item.versions?.[0]?.id ?? null,
    currentVersionDisplayTitle: deriveDisplayTitle(item.versions?.[0]?.originalContent, "Baket tanpa isi"),
    summary: item.versions?.[0]?.fieldOfficerNote ?? null,
    categoryName: item.reportCategory?.name ?? null,
    urgency: item.versions?.[0]?.urgency ?? null,
    sentToPositionTitle: oimPositionTitleFrom(item.createdByFieldOfficerAssignment?.position) ?? null,
  }));
}

export type FieldOfficerWorkspaceView =
  | "tasks"
  | "incoming"
  | "jaring"
  | "baket"
  | "reports"
  | "map"
  | "alert"
  | "overview";

export type FieldOfficerViewResponse = {
  view: FieldOfficerWorkspaceView;
  data: FieldOfficerWorkspace;
};

export async function getFieldOfficerView(
  cookie: string,
  view: FieldOfficerWorkspaceView,
  filters: {
    categoryId?: string;
    from?: string;
    to?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {},
): Promise<FieldOfficerViewResponse> {
  const access = await getAccess(cookie);
  const assignmentId = access.context.primaryAssignmentId;
  const workspace = emptyWorkspace(access);

  if (view === "tasks") {
    const tasks = await backendApi<TaskRecord[]>("/tasks", {
      cookie,
      query: {
        assigneeAssignmentId: assignmentId,
        limit: 50,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      },
    });
    workspace.tasks = tasks
      .map((record) => mapTask(record, assignmentId))
      .filter((value): value is FieldOfficerTask => Boolean(value));
    return { view, data: workspace };
  }

  if (view === "incoming") {
    const [approvedJaring, messages] = await Promise.all([
      backendApi<JaringRecord[]>("/jaring", {
        cookie,
        query: { limit: 100, registrationStatus: "APPROVED" },
      }),
      backendApi<MessageRecord[]>("/whatsapp-messages", {
        cookie,
        query: { limit: 100 },
      }),
    ]);
    workspace.jaring = ownJaring(approvedJaring, assignmentId);
    const jaringIndex = new Map(workspace.jaring.map((item) => [item.id, item] as const));
    const mappedMessages = messages.flatMap((message) => {
      const sourceJaring = message.jaring?.id ? jaringIndex.get(message.jaring.id) : undefined;
      return sourceJaring ? [mapIncoming(message, sourceJaring)] : [];
    });
    workspace.jaringReports = mappedMessages.sort((left, right) => right.receivedAt.localeCompare(left.receivedAt));
    workspace.incoming = workspace.jaringReports.filter(
      (item) => !["READY_FOR_BAKET", "PROCESSED", "SPAM", "DUPLICATE"].includes(item.status),
    );
    return { view, data: workspace };
  }

  if (view === "jaring") {
    const [pending, approved, rejected, occupations, scopedAreas] = await Promise.all([
      backendApi<JaringRecord[]>("/jaring", {
        cookie,
        query: { limit: 100, registrationStatus: "PENDING" },
      }),
      backendApi<JaringRecord[]>("/jaring", {
        cookie,
        query: { limit: 100, registrationStatus: "APPROVED" },
      }),
      backendApi<JaringRecord[]>("/jaring", {
        cookie,
        query: { limit: 100, registrationStatus: "REJECTED" },
      }),
      backendApi<Array<JaringOccupation & { _count?: { jaring?: number } }>>("/jaring/occupations", {
        cookie,
        query: { limit: 200 },
      }),
      backendApi<AreaScopeRecord[]>("/me/area-scopes", {
        cookie,
        query: { includeDescendants: true },
      }),
    ]);
    const unique = Array.from(new Map([...pending, ...approved, ...rejected].map((item) => [item.id, item])).values());
    workspace.jaring = ownJaring(unique, assignmentId);
    workspace.occupations = occupations.map((occupation) => ({
      id: occupation.id,
      code: occupation.code,
      name: occupation.name,
      description: occupation.description ?? null,
      isActive: occupation.isActive,
      jaringCount: occupation._count?.jaring ?? occupation.jaringCount,
    }));
    workspace.districtAreas = scopedAreas.filter((area) => area.level === "DISTRICT");
    workspace.villageAreas = scopedAreas.filter((area) => area.level === "VILLAGE" || area.level === "URBAN_VILLAGE");
    return { view, data: workspace };
  }

  if (view === "baket" || view === "reports") {
    const includeCandidates = view === "baket";
    const [approvedJaring, reportCategories, baketResponse, messages, tasks] = await Promise.all([
      backendApi<JaringRecord[]>("/jaring", {
        cookie,
        query: { limit: 100, registrationStatus: "APPROVED" },
      }),
      backendApi<Array<ReportCategory & { _count?: { whatsAppMessages?: number } }>>("/jaring/report-categories", {
        cookie,
        query: { limit: 200 },
      }),
      backendApi<BaketRecord[] | PagedResponse<BaketRecord>>("/bakets", {
        cookie,
        query: {
          createdByAssignmentId: assignmentId,
          categoryId: filters.categoryId,
          from: filters.from ? `${filters.from}T00:00:00.000+07:00` : undefined,
          to: filters.to ? `${filters.to}T23:59:59.999+07:00` : undefined,
          limit: 50,
        },
      }),
      includeCandidates
        ? backendApi<MessageRecord[]>("/whatsapp-messages", {
            cookie,
            query: { limit: 100 },
          })
        : Promise.resolve([]),
      includeCandidates
        ? backendApi<TaskRecord[]>("/tasks", {
            cookie,
            query: { assigneeAssignmentId: assignmentId, limit: 50 },
          })
        : Promise.resolve([]),
    ]);
    workspace.jaring = ownJaring(approvedJaring, assignmentId);
    const jaringIndex = new Map(workspace.jaring.map((item) => [item.id, item] as const));
    workspace.reportCategories = mapCategories(reportCategories);
    workspace.tasks = tasks
      .map((record) => mapTask(record, assignmentId))
      .filter((value): value is FieldOfficerTask => Boolean(value));
    workspace.baketCandidates = messages.flatMap((message) => {
      const source = message.jaring?.id ? jaringIndex.get(message.jaring.id) : undefined;
      const mapped = source ? mapIncoming(message, source) : null;
      return mapped?.status === "READY_FOR_BAKET" && mapped.validationSummary === "VALID" ? [mapped] : [];
    });
    const ownBakets = Array.isArray(baketResponse) ? baketResponse : (baketResponse.items ?? []);
    workspace.bakets = mapBakets(ownBakets, jaringIndex);
    return { view, data: workspace };
  }

  if (view === "map") {
    const [messages, latestLocation] = await Promise.all([
      backendApi<MessageRecord[]>("/whatsapp-messages", {
        cookie,
        query: { limit: 100 },
      }),
      backendApi<LocationRecord>("/personnel-location-pings/me/latest", {
        cookie,
      }).catch(() => null),
    ]);
    workspace.incoming = messages.flatMap((message) => {
      const source = messageJaring(message);
      return source ? [mapIncoming(message, source)] : [];
    });
    workspace.latestLocation = latestLocation
      ? {
          id: latestLocation.id,
          latitude: asNumber(latestLocation.latitude) ?? 0,
          longitude: asNumber(latestLocation.longitude) ?? 0,
          capturedAt: latestLocation.capturedAt,
          gpsAccuracyMeters: asNumber(latestLocation.gpsAccuracyMeters),
          areaName: latestLocation.area?.name ?? null,
        }
      : null;
    return { view, data: workspace };
  }

  // Overview/alert remain compatible until those pages get dedicated widgets.
  return { view, data: await getFieldOfficerWorkspace(cookie, filters) };
}

export async function getFieldOfficerWorkspace(
  cookie: string,
  baketFilters: {
    categoryId?: string;
    from?: string;
    to?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {},
): Promise<FieldOfficerWorkspace> {
  const access = await getAccess(cookie);
  const assignmentId = access.context.primaryAssignmentId;

  const [
    pendingJaring,
    approvedJaring,
    rejectedJaring,
    occupations,
    reportCategories,
    messages,
    reportSessionsResponse,
    tasks,
    baketResponse,
    scopedAreas,
    latestLocation,
  ] = await Promise.all([
    backendApi<JaringRecord[]>("/jaring", {
      cookie,
      query: { limit: 100, registrationStatus: "PENDING" },
    }),
    backendApi<JaringRecord[]>("/jaring", {
      cookie,
      query: { limit: 100, registrationStatus: "APPROVED" },
    }),
    backendApi<JaringRecord[]>("/jaring", {
      cookie,
      query: { limit: 100, registrationStatus: "REJECTED" },
    }),
    backendApi<Array<JaringOccupation & { _count?: { jaring?: number } }>>("/jaring/occupations", {
      cookie,
      query: { limit: 200 },
    }),
    backendApi<Array<ReportCategory & { _count?: { whatsAppMessages?: number } }>>("/jaring/report-categories", {
      cookie,
      query: { limit: 200 },
    }),
    backendApi<MessageRecord[]>("/whatsapp-messages", {
      cookie,
      query: { limit: 100 },
    }),
    backendApi<PagedResponse<JaringReportSessionRecord>>("/jaring/reports", {
      cookie,
      query: { limit: 100, registrationStatus: "APPROVED" },
    }),
    backendApi<TaskRecord[]>("/tasks", {
      cookie,
      query: {
        assigneeAssignmentId: assignmentId,
        limit: 50,
        sortBy: baketFilters.sortBy,
        sortOrder: baketFilters.sortOrder,
      },
    }),
    backendApi<BaketRecord[] | PagedResponse<BaketRecord>>("/bakets", {
      cookie,
      query: {
        createdByAssignmentId: assignmentId,
        categoryId: baketFilters.categoryId,
        from: baketFilters.from ? `${baketFilters.from}T00:00:00.000+07:00` : undefined,
        to: baketFilters.to ? `${baketFilters.to}T23:59:59.999+07:00` : undefined,
        limit: 50,
      },
    }),
    backendApi<AreaScopeRecord[]>("/me/area-scopes", {
      cookie,
      query: { includeDescendants: true },
    }),
    backendApi<LocationRecord>("/personnel-location-pings/me/latest", {
      cookie,
    }).catch(() => null),
  ]);

  const allJaring = Array.from(
    new Map([...pendingJaring, ...approvedJaring, ...rejectedJaring].map((item) => [item.id, item])).values(),
  );
  const ownBakets = Array.isArray(baketResponse) ? baketResponse : (baketResponse.items ?? []);
  const districtAreas = scopedAreas.filter((area) => area.level === "DISTRICT");
  const villageAreas = scopedAreas.filter((area) => area.level === "VILLAGE" || area.level === "URBAN_VILLAGE");

  const jaring = allJaring
    .filter((item) =>
      (item.caretakerAssignments ?? []).some((caretaker) => caretaker.fieldOfficerAssignment?.id === assignmentId),
    )
    .map(mapJaringRecord);

  const baketIndex = new Map<string, FieldOfficerJaring>();
  for (const item of jaring) {
    baketIndex.set(item.id, item);
  }
  const mappedMessages = messages.flatMap((message) => {
    const sourceJaring = message.jaring?.id ? baketIndex.get(message.jaring.id) : undefined;
    return sourceJaring ? [mapIncoming(message, sourceJaring)] : [];
  });
  const activeDrafts = (reportSessionsResponse.items ?? []).flatMap((report) => {
    if (report.status !== "ACTIVE") return [];
    const sourceJaring = baketIndex.get(report.jaringId);
    return sourceJaring ? [mapDraftReport(report, sourceJaring)] : [];
  });
  const reportsWithDrafts = [...activeDrafts, ...mappedMessages];

  return {
    context: access.context,
    profile: access.profile,
    jaring,
    occupations: occupations.map((occupation) => ({
      id: occupation.id,
      code: occupation.code,
      name: occupation.name,
      description: occupation.description ?? null,
      isActive: occupation.isActive,
      jaringCount: occupation._count?.jaring ?? occupation.jaringCount,
    })),
    districtAreas,
    villageAreas,
    reportCategories: sortReportCategories(reportCategories).map((category) => ({
      id: category.id,
      code: category.code,
      name: category.name,
      description: category.description ?? null,
      isActive: category.isActive,
      messageCount: category._count?.whatsAppMessages ?? category.messageCount,
    })),
    jaringReports: reportsWithDrafts.sort((left, right) => right.receivedAt.localeCompare(left.receivedAt)),
    incoming: reportsWithDrafts
      .filter((item) => !["READY_FOR_BAKET", "PROCESSED", "SPAM", "DUPLICATE"].includes(item.status))
      .sort((left, right) => right.receivedAt.localeCompare(left.receivedAt)),
    baketCandidates: mappedMessages
      .filter((item) => item.status === "READY_FOR_BAKET" && item.validationSummary === "VALID")
      .sort((left, right) => right.receivedAt.localeCompare(left.receivedAt)),
    tasks: tasks
      .map((record) => mapTask(record, assignmentId))
      .filter((value): value is FieldOfficerTask => Boolean(value)),
    bakets: ownBakets.map<FieldOfficerBaket>((item) => ({
      id: item.id,
      status: item.status,
      createdAt: item.createdAt,
      primaryJaringId: item.primaryJaringId ?? null,
      primaryJaringCode: item.primaryJaringId
        ? (baketIndex.get(item.primaryJaringId)?.aliasName ?? item.primaryJaringId)
        : null,
      primaryJaringAlias: item.primaryJaringId ? (baketIndex.get(item.primaryJaringId)?.aliasName ?? null) : null,
      currentVersionId: item.versions?.[0]?.id ?? null,
      currentVersionDisplayTitle: deriveDisplayTitle(item.versions?.[0]?.originalContent, "Baket tanpa isi"),
      summary: item.versions?.[0]?.fieldOfficerNote ?? null,
      categoryName: item.reportCategory?.name ?? null,
      urgency: item.versions?.[0]?.urgency ?? null,
      sentToPositionTitle: oimPositionTitleFrom(item.createdByFieldOfficerAssignment?.position) ?? null,
    })),
    latestLocation: latestLocation
      ? {
          id: latestLocation.id,
          latitude: asNumber(latestLocation.latitude) ?? 0,
          longitude: asNumber(latestLocation.longitude) ?? 0,
          capturedAt: latestLocation.capturedAt,
          gpsAccuracyMeters: asNumber(latestLocation.gpsAccuracyMeters),
          areaName: latestLocation.area?.name ?? null,
        }
      : null,
  };
}

export async function createFieldOfficerJaring(
  cookie: string,
  body: {
    aliasName?: string;
    whatsappNumber: string;
    address: string;
    occupationId: string;
    profilePhotoFileId: string;
    notes?: string;
    areaIds: string[];
    fieldOfficerAssignmentId: string;
  },
) {
  return backendApi("/jaring", {
    cookie,
    method: "POST",
    body,
    idempotent: true,
  });
}

export async function updateFieldOfficerJaring(
  cookie: string,
  jaringId: string,
  body: {
    aliasName?: string;
    whatsappNumber?: string;
    fullName?: string;
    nationalIdNumber?: string;
    address?: string;
    birthPlace?: string;
    birthDate?: string;
    gender?: string;
    occupationId?: string;
    profilePhotoFileId?: string;
    workplace?: string;
    jobTitle?: string;
    joinedAt?: string;
    organizationName?: string;
    politicalAffiliation?: string;
    areaIds?: string[];
    notes?: string;
  },
) {
  return backendApi(`/jaring/${jaringId}`, {
    cookie,
    method: "PATCH",
    body,
  });
}

export async function updateFieldOfficerJaringStatus(
  cookie: string,
  jaringId: string,
  action: "activate" | "deactivate" | "delete",
  reason: string,
) {
  return backendApi(`/jaring/${jaringId}/${action}`, {
    cookie,
    method: "POST",
    body: { reason },
    idempotent: true,
  });
}

export async function validateIncomingMessage(cookie: string, messageId: string) {
  return backendApi(`/whatsapp-messages/${messageId}/validate`, {
    cookie,
    method: "POST",
    idempotent: true,
  });
}

export async function assignIncomingMessageCategory(cookie: string, messageId: string, categoryId: string) {
  return backendApi(`/whatsapp-messages/${messageId}/category`, {
    cookie,
    method: "PATCH",
    body: { categoryId },
  });
}

export async function createBaketFromMessage(
  cookie: string,
  messageId: string,
  body: {
    categoryId: string;
    urgency: "LOW" | "NORMAL" | "HIGH" | "URGENT";
    normalizedContent?: string;
    fieldOfficerNote?: string;
    taskAssignmentId?: string;
  },
) {
  return backendApi(`/whatsapp-messages/${messageId}/create-baket`, {
    cookie,
    method: "POST",
    body,
    idempotent: true,
  });
}

export async function deleteIncomingMessage(cookie: string, messageId: string) {
  return backendApi(`/whatsapp-messages/${messageId}/mark-spam`, {
    cookie,
    method: "POST",
    body: { reason: "Dihapus dari Informasi Jaring oleh Petugas Wilayah (Gaswil)." },
    idempotent: true,
  });
}

export async function submitBaket(cookie: string, baketId: string) {
  return backendApi(`/bakets/${baketId}/submit`, {
    cookie,
    method: "POST",
    body: { confirmation: "SUBMIT" },
    idempotent: true,
  });
}

export async function updateBaketDraft(
  cookie: string,
  baketId: string,
  body: {
    versionId: string;
    reportCategoryId: string;
    taskAssignmentId?: string | null;
    normalizedContent?: string;
    urgency: "LOW" | "NORMAL" | "HIGH" | "URGENT";
    fieldOfficerNote?: string;
  },
) {
  await backendApi(`/bakets/${baketId}`, {
    cookie,
    method: "PATCH",
    body: {
      reportCategoryId: body.reportCategoryId,
      taskAssignmentId: body.taskAssignmentId,
    },
  });
  return backendApi(`/baket-versions/${body.versionId}`, {
    cookie,
    method: "PATCH",
    body: {
      normalizedContent: body.normalizedContent,
      urgency: body.urgency,
      fieldOfficerNote: body.fieldOfficerNote,
    },
  });
}

export async function updateTaskAssignmentStatus(
  cookie: string,
  assignmentId: string,
  nextStatus: "READ" | "ACKNOWLEDGED" | "IN_PROGRESS" | "COMPLETED",
  note?: string,
) {
  const payload = note ? { note } : {};

  if (nextStatus === "READ") {
    return backendApi(`/task-assignments/${assignmentId}/mark-read`, {
      cookie,
      method: "POST",
      idempotent: true,
    });
  }

  if (nextStatus === "ACKNOWLEDGED") {
    return backendApi(`/task-assignments/${assignmentId}/acknowledge`, {
      cookie,
      method: "POST",
      body: payload,
      idempotent: true,
    });
  }

  if (nextStatus === "IN_PROGRESS") {
    return backendApi(`/task-assignments/${assignmentId}/start`, {
      cookie,
      method: "POST",
      body: payload,
      idempotent: true,
    });
  }

  return backendApi(`/task-assignments/${assignmentId}/complete`, {
    cookie,
    method: "POST",
    body: payload,
    idempotent: true,
  });
}

export async function forwardTaskInstructionToJaring(
  cookie: string,
  assignmentId: string,
  body: {
    instruction: string;
    jaringIds?: string[];
  },
) {
  return backendApi<JaringInstructionDispatch>(`/task-assignments/${assignmentId}/jaring-instructions`, {
    cookie,
    method: "POST",
    body,
    idempotent: true,
  });
}

export async function createOwnLocationPing(
  cookie: string,
  body: {
    positionAssignmentId: string;
    latitude: number;
    longitude: number;
    gpsAccuracyMeters?: number | null;
    capturedAt: string;
    isStealth?: boolean;
  },
) {
  return backendApi("/personnel-location-pings", {
    cookie,
    method: "POST",
    idempotent: true,
    body: {
      ...body,
      coordinateSource: "DEVICE_GPS",
    },
  });
}

export async function getWhatsappControlChannels(cookie: string) {
  return backendApi<WhatsappControlChannel[]>("/integration-channels/whatsapp-control", {
    cookie,
  });
}

export async function createWhatsappControlChannel(
  cookie: string,
  body: {
    code: string;
    name: string;
    config: {
      userId: string;
      scopeAreaIds?: string[];
      [key: string]: unknown;
    };
  },
) {
  return backendApi("/integration-channels", {
    cookie,
    method: "POST",
    body: {
      code: body.code,
      name: body.name,
      channelType: "WHATSAPP",
      status: "INACTIVE",
      config: body.config,
    },
    idempotent: true,
  });
}

export async function updateWhatsappControlChannel(
  cookie: string,
  channelId: string,
  body: {
    name?: string;
    botLabel?: string;
    provider?: string;
    botPhoneNumber?: string;
    pairingMethod?: "qr" | "code";
    scopeAreaIds?: string[];
    senderNumbers?: string[];
  },
) {
  return backendApi(`/integration-channels/whatsapp-control/${channelId}`, {
    cookie,
    method: "PATCH",
    body,
  });
}

export async function activateWhatsappControlChannel(
  cookie: string,
  channelId: string,
  mode: "activate" | "deactivate" | "test" | "request-qr",
  options: { resetSession?: boolean } = {},
) {
  if (mode === "request-qr") {
    return backendApi(`/integration-channels/whatsapp-control/${channelId}/request-qr`, {
      cookie,
      method: "POST",
      body: { resetSession: options.resetSession === true },
      idempotent: true,
    });
  }

  if (mode === "test") {
    return backendApi(`/integration-channels/${channelId}/test`, {
      cookie,
      method: "POST",
      body: { mode: "HEALTH" },
      idempotent: true,
    });
  }

  return backendApi(`/integration-channels/${channelId}/${mode}`, {
    cookie,
    method: "POST",
    body: {
      reason: `Requested from field coordinator control desk (${mode}).`,
    },
    idempotent: true,
  });
}

export async function removeWhatsappControlChannel(cookie: string, channelId: string) {
  return backendApi(`/integration-channels/${channelId}`, {
    cookie,
    method: "DELETE",
  });
}
