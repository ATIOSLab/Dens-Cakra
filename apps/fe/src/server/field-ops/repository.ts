import "server-only";

import type { PagedResponse } from "@/lib/api/types";
import { backendApi } from "@/server/backend-api";

import type {
  AccessContext,
  FieldOfficerBaket,
  FieldOfficerIncoming,
  FieldOfficerJaring,
  FieldOfficerLocation,
  FieldOfficerTask,
  FieldOfficerWorkspace,
  JaringCluster,
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
  code: string;
  aliasName: string;
  whatsappNumber: string;
  clusterId?: string | null;
  cluster?: {
    id: string;
    name: string;
  } | null;
  status: string;
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
};

type MessageRecord = {
  id: string;
  senderPhone: string;
  title?: string | null;
  content?: string | null;
  status: string;
  validationSummary: string;
  categoryId?: string | null;
  category?: {
    id: string;
    name: string;
  } | null;
  jaring?: {
    id: string;
    code: string;
    aliasName?: string | null;
    clusterId?: string | null;
    cluster?: { id: string; name: string } | null;
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
};

type TaskRecord = {
  id: string;
  title: string;
  description: string;
  priority: string;
  dueDate?: string | null;
  status: string;
  directiveVersion?: {
    directive?: {
      title?: string | null;
      code?: string | null;
    } | null;
  } | null;
  uukStrVersion?: {
    uukStr?: {
      title?: string | null;
      code?: string | null;
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
    progressPercent?: number | null;
    assigneeAssignmentId: string;
    assigner?: {
      userProfile?: {
        fullName?: string | null;
      } | null;
    } | null;
  }>;
};

type BaketRecord = {
  id: string;
  status: string;
  createdAt: string;
  primaryJaringId?: string | null;
  reportCategory?: { name: string } | null;
  jaringCluster?: { name: string } | null;
  versions?: Array<{
    id: string;
    title: string;
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

function mapTask(
  record: TaskRecord,
  assignmentId: string,
): FieldOfficerTask | null {
  const assignment = record.assignments?.find(
    (item) => item.assigneeAssignmentId === assignmentId,
  );

  if (!assignment) {
    return null;
  }

  const sourceLabel =
    record.directiveVersion?.directive?.title ||
    record.directiveVersion?.directive?.code ||
    record.uukStrVersion?.uukStr?.title ||
    record.uukStrVersion?.uukStr?.code ||
    null;

  return {
    assignmentId: assignment.id,
    taskId: record.id,
    title: record.title,
    description: record.description,
    priority: record.priority,
    dueDate: record.dueDate ?? null,
    taskStatus: record.status,
    assignmentStatus: assignment.status,
    sourceLabel,
    targetAreas: (record.targetAreas ?? [])
      .map((item) => item.area?.name)
      .filter(Boolean) as string[],
    assignerName: assignment.assigner?.userProfile?.fullName ?? null,
    progressSummary:
      assignment.progressPercent !== null &&
      assignment.progressPercent !== undefined
        ? `${assignment.progressPercent}%`
        : assignment.status,
  };
}

function mapIncoming(
  record: MessageRecord,
  jaring: FieldOfficerJaring,
): FieldOfficerIncoming {
  const rawPayload = asRecord(record.rawPayload);
  const photoMessageId = asString(rawPayload?.photoMessageId);
  const photoCaption = asString(rawPayload?.photoCaption);
  const photoFileId =
    record.media?.find((item) => item.fileId || item.file?.id)?.fileId ??
    record.media?.find((item) => item.file?.id)?.file?.id ??
    null;

  return {
    id: record.id,
    jaringId: jaring.id,
    jaringCode: jaring.code,
    jaringAlias: jaring.aliasName,
    clusterId: jaring.clusterId,
    clusterName: jaring.clusterName,
    senderPhone: record.senderPhone,
    title: record.title ?? null,
    content: record.content ?? null,
    status: record.status,
    validationSummary: record.validationSummary,
    categoryId: record.categoryId ?? record.category?.id ?? null,
    categoryName: record.category?.name ?? null,
    receivedAt: record.receivedAt,
    eventDateTime:
      asString(rawPayload?.eventDateTime) ?? record.locationCapturedAt ?? null,
    gpsSharedAt: asString(rawPayload?.gpsSharedAt),
    processedAt: record.processedAt ?? null,
    reportTimestamp:
      asString(rawPayload?.timestamp) ??
      record.processedAt ??
      record.receivedAt,
    areaName: record.resolvedArea?.name ?? null,
    latitude: asNumber(record.latitude),
    longitude: asNumber(record.longitude),
    gpsAccuracyMeters: asNumber(record.gpsAccuracyMeters),
    mediaCount: record.media?.length ?? 0,
    hasPhoto: Boolean(record.media?.length || photoMessageId),
    photoCaption,
    photoMessageId,
    photoFileId,
    photoUrl: photoFileId ? `/api/field-officer/files/${photoFileId}` : null,
  };
}

export async function getFieldOfficerWorkspace(
  cookie: string,
  baketFilters: {
    categoryId?: string;
    jaringClusterId?: string;
    from?: string;
    to?: string;
  } = {},
): Promise<FieldOfficerWorkspace> {
  const access = await getAccess(cookie);
  const assignmentId = access.context.primaryAssignmentId;

  const [
    allJaring,
    jaringClusters,
    reportCategories,
    messages,
    tasks,
    baketResponse,
    latestLocation,
  ] = await Promise.all([
    backendApi<JaringRecord[]>("/jaring", {
      cookie,
      query: { limit: 100 },
    }),
    backendApi<Array<JaringCluster & { _count?: { jaring?: number } }>>(
      "/jaring/clusters",
      {
        cookie,
        query: { limit: 200 },
      },
    ),
    backendApi<
      Array<ReportCategory & { _count?: { whatsAppMessages?: number } }>
    >("/jaring/report-categories", {
      cookie,
      query: { limit: 200 },
    }),
    backendApi<MessageRecord[]>("/whatsapp-messages", {
      cookie,
      query: { limit: 100 },
    }),
    backendApi<TaskRecord[]>("/tasks", {
      cookie,
      query: {
        assigneeAssignmentId: assignmentId,
        limit: 50,
      },
    }),
    backendApi<BaketRecord[] | PagedResponse<BaketRecord>>("/bakets", {
      cookie,
      query: {
        createdByAssignmentId: assignmentId,
        categoryId: baketFilters.categoryId,
        jaringClusterId: baketFilters.jaringClusterId,
        from: baketFilters.from
          ? `${baketFilters.from}T00:00:00.000+07:00`
          : undefined,
        to: baketFilters.to
          ? `${baketFilters.to}T23:59:59.999+07:00`
          : undefined,
        limit: 50,
      },
    }),
    backendApi<LocationRecord>("/personnel-location-pings/me/latest", {
      cookie,
    }).catch(() => null),
  ]);

  const ownBakets = Array.isArray(baketResponse)
    ? baketResponse
    : (baketResponse.items ?? []);

  const jaring = allJaring
    .filter((item) =>
      (item.caretakerAssignments ?? []).some(
        (caretaker) => caretaker.fieldOfficerAssignment?.id === assignmentId,
      ),
    )
    .map<FieldOfficerJaring>((item) => ({
      id: item.id,
      code: item.code,
      aliasName: item.aliasName,
      whatsappNumber: item.whatsappNumber,
      clusterId: item.clusterId ?? item.cluster?.id ?? null,
      clusterName: item.cluster?.name ?? null,
      status: item.status,
      notes: item.notes ?? null,
      areaNames: (item.areaCoverages ?? [])
        .map((coverage) => coverage.area?.name)
        .filter(Boolean) as string[],
      areaIds: (item.areaCoverages ?? []).map((coverage) => coverage.areaId),
      messageCount: item._count?.messages ?? 0,
      baketCount: item._count?.primaryBakets ?? 0,
    }));

  const baketIndex = new Map<string, FieldOfficerJaring>();
  for (const item of jaring) {
    baketIndex.set(item.id, item);
  }
  const mappedMessages = messages.flatMap((message) => {
    const sourceJaring = message.jaring?.id
      ? baketIndex.get(message.jaring.id)
      : undefined;
    return sourceJaring ? [mapIncoming(message, sourceJaring)] : [];
  });

  return {
    context: access.context,
    profile: access.profile,
    jaring,
    jaringClusters: jaringClusters.map((cluster) => ({
      id: cluster.id,
      code: cluster.code,
      name: cluster.name,
      description: cluster.description ?? null,
      isActive: cluster.isActive,
      jaringCount: cluster._count?.jaring ?? cluster.jaringCount,
    })),
    reportCategories: reportCategories.map((category) => ({
      id: category.id,
      code: category.code,
      name: category.name,
      description: category.description ?? null,
      isActive: category.isActive,
      messageCount: category._count?.whatsAppMessages ?? category.messageCount,
    })),
    incoming: mappedMessages
      .filter(
        (item) =>
          !["READY_FOR_BAKET", "PROCESSED", "SPAM", "DUPLICATE"].includes(
            item.status,
          ),
      )
      .sort((left, right) => right.receivedAt.localeCompare(left.receivedAt)),
    baketCandidates: mappedMessages
      .filter(
        (item) =>
          item.status === "READY_FOR_BAKET" &&
          item.validationSummary === "VALID",
      )
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
        ? (baketIndex.get(item.primaryJaringId)?.code ?? null)
        : null,
      primaryJaringAlias: item.primaryJaringId
        ? (baketIndex.get(item.primaryJaringId)?.aliasName ?? null)
        : null,
      currentVersionId: item.versions?.[0]?.id ?? null,
      currentVersionTitle: item.versions?.[0]?.title ?? null,
      summary: item.versions?.[0]?.fieldOfficerNote ?? null,
      categoryName: item.reportCategory?.name ?? null,
      clusterName: item.jaringCluster?.name ?? null,
      urgency: item.versions?.[0]?.urgency ?? null,
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
    code: string;
    aliasName: string;
    whatsappNumber: string;
    clusterId?: string;
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
  action: "activate" | "deactivate" | "archive",
  reason: string,
) {
  return backendApi(`/jaring/${jaringId}/${action}`, {
    cookie,
    method: "POST",
    body: { reason },
    idempotent: true,
  });
}

export async function validateIncomingMessage(
  cookie: string,
  messageId: string,
) {
  return backendApi(`/whatsapp-messages/${messageId}/validate`, {
    cookie,
    method: "POST",
    idempotent: true,
  });
}

export async function assignIncomingMessageCategory(
  cookie: string,
  messageId: string,
  categoryId: string,
) {
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
    title?: string;
    normalizedContent?: string;
    fieldOfficerNote?: string;
    taskAssignmentId?: string;
    eventTime?: string;
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
    body: { reason: "Dihapus dari Kotak Masuk Jaring oleh Field Officer." },
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
    title: string;
    normalizedContent?: string;
    eventTime?: string;
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
      title: body.title,
      normalizedContent: body.normalizedContent,
      eventTime: body.eventTime,
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
  return backendApi<WhatsappControlChannel[]>(
    "/integration-channels/whatsapp-control",
    {
      cookie,
    },
  );
}

export async function createWhatsappControlChannel(
  cookie: string,
  body: {
    code: string;
    name: string;
    config: {
      userId: string;
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
) {
  if (mode === "request-qr") {
    return backendApi(
      `/integration-channels/whatsapp-control/${channelId}/request-qr`,
      {
        cookie,
        method: "POST",
        idempotent: true,
      },
    );
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

export async function removeWhatsappControlChannel(
  cookie: string,
  channelId: string,
) {
  return backendApi(`/integration-channels/${channelId}`, {
    cookie,
    method: "DELETE",
  });
}
