import "server-only";

import { backendApi } from "@/server/backend-api";

import type {
  AccessContext,
  FieldOfficerBaket,
  FieldOfficerIncoming,
  FieldOfficerJaring,
  FieldOfficerLocation,
  FieldOfficerTask,
  FieldOfficerWorkspace,
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
  receivedAt: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  gpsAccuracyMeters?: string | number | null;
  resolvedArea?: {
    name?: string | null;
  } | null;
  media?: Array<unknown>;
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
  versions?: Array<{
    id: string;
    title: string;
    fieldOfficerNote?: string | null;
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
    targetAreas: (record.targetAreas ?? []).map((item) => item.area?.name).filter(Boolean) as string[],
    assignerName: assignment.assigner?.userProfile?.fullName ?? null,
    progressSummary:
      assignment.progressPercent !== null && assignment.progressPercent !== undefined
        ? `${assignment.progressPercent}%`
        : assignment.status,
  };
}

function mapIncoming(record: MessageRecord, jaring: FieldOfficerJaring): FieldOfficerIncoming {
  return {
    id: record.id,
    jaringId: jaring.id,
    jaringCode: jaring.code,
    jaringAlias: jaring.aliasName,
    senderPhone: record.senderPhone,
    title: record.title ?? null,
    content: record.content ?? null,
    status: record.status,
    validationSummary: record.validationSummary,
    receivedAt: record.receivedAt,
    areaName: record.resolvedArea?.name ?? null,
    latitude: asNumber(record.latitude),
    longitude: asNumber(record.longitude),
    gpsAccuracyMeters: asNumber(record.gpsAccuracyMeters),
    mediaCount: record.media?.length ?? 0,
    hasPhoto: Boolean(record.media?.length),
  };
}

export async function getFieldOfficerWorkspace(cookie: string): Promise<FieldOfficerWorkspace> {
  const access = await getAccess(cookie);
  const assignmentId = access.context.primaryAssignmentId;

  const [allJaring, tasks, ownBakets, latestLocation] = await Promise.all([
    backendApi<JaringRecord[]>("/jaring", {
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
    backendApi<BaketRecord[]>("/bakets", {
      cookie,
      query: {
        createdByAssignmentId: assignmentId,
        limit: 50,
      },
    }),
    backendApi<LocationRecord>("/personnel-location-pings/me/latest", { cookie }).catch(() => null),
  ]);

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
      status: item.status,
      notes: item.notes ?? null,
      areaNames: (item.areaCoverages ?? []).map((coverage) => coverage.area?.name).filter(Boolean) as string[],
      areaIds: (item.areaCoverages ?? []).map((coverage) => coverage.areaId),
      messageCount: item._count?.messages ?? 0,
      baketCount: item._count?.primaryBakets ?? 0,
    }));

  const incomingGroups = await Promise.all(
    jaring.map(async (item) => {
      const messages = await backendApi<MessageRecord[]>(`/jaring/${item.id}/messages`, { cookie });
      return messages.map((message) => mapIncoming(message, item));
    }),
  );

  const baketIndex = new Map<string, FieldOfficerJaring>();
  for (const item of jaring) {
    baketIndex.set(item.id, item);
  }

  return {
    context: access.context,
    profile: access.profile,
    jaring,
    incoming: incomingGroups.flat().sort((left, right) => right.receivedAt.localeCompare(left.receivedAt)),
    tasks: tasks
      .map((record) => mapTask(record, assignmentId))
      .filter((value): value is FieldOfficerTask => Boolean(value)),
    bakets: ownBakets.map<FieldOfficerBaket>((item) => ({
      id: item.id,
      status: item.status,
      createdAt: item.createdAt,
      primaryJaringId: item.primaryJaringId ?? null,
      primaryJaringCode: item.primaryJaringId ? baketIndex.get(item.primaryJaringId)?.code ?? null : null,
      primaryJaringAlias: item.primaryJaringId ? baketIndex.get(item.primaryJaringId)?.aliasName ?? null : null,
      currentVersionId: item.versions?.[0]?.id ?? null,
      currentVersionTitle: item.versions?.[0]?.title ?? null,
      summary: item.versions?.[0]?.fieldOfficerNote ?? null,
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

export async function validateIncomingMessage(cookie: string, messageId: string) {
  return backendApi(`/whatsapp-messages/${messageId}/validate`, {
    cookie,
    method: "POST",
    idempotent: true,
  });
}

export async function createBaketFromMessage(cookie: string, messageId: string) {
  return backendApi(`/whatsapp-messages/${messageId}/create-baket`, {
    cookie,
    method: "POST",
    idempotent: true,
  });
}

export async function submitBaket(cookie: string, baketId: string) {
  return backendApi(`/bakets/${baketId}/submit`, {
    cookie,
    method: "POST",
    body: { confirmation: "FIELD_OFFICER_SUBMIT" },
    idempotent: true,
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
  return backendApi<WhatsappControlChannel[]>("/integration-channels/whatsapp-control", {
    cookie,
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
    return backendApi(`/integration-channels/whatsapp-control/${channelId}/request-qr`, {
      cookie,
      method: "POST",
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
    body: { reason: `Requested from field coordinator control desk (${mode}).` },
    idempotent: true,
  });
}
