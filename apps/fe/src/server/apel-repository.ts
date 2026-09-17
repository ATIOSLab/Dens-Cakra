import "server-only";

import { backendApi } from "@/server/backend-api";

export type ApelConfigItem = {
  id: string;
  title: string;
  description: string | null;
  targetType: "ALL" | "AREA" | "GASWIL" | "JARING";
  targetGaswilIds: string[] | null;
  targetJaringIds: string[] | null;
  areaId: string | null;
  channelSelectionMode: "MANUAL" | "LOAD_BALANCE";
  selectedChannelId: string | null;
  selectedChannelIds: string[] | null;
  messageTemplate: string;
  attendanceReplyTemplate?: string | null;
  scheduleTime: string;
  deadlineTime: string;
  deadlineMinutes: number;
  requireLocation: boolean;
  isActive: boolean;
  minDelaySeconds: number;
  maxDelaySeconds: number;
  batchSize: number;
  batchPauseSeconds: number;
  createdAt: string;
  updatedAt: string;
  area?: {
    id: string;
    code: string;
    name: string;
    level: string;
  } | null;
  selectedChannel?: {
    id: string;
    code: string;
    name: string;
    status: string;
    config: unknown;
  } | null;
};

export type ApelSessionItem = {
  id: string;
  configId: string | null;
  title: string;
  sessionDate: string;
  targetType: string;
  targetGaswilIds: string[] | null;
  targetJaringIds: string[] | null;
  areaId: string | null;
  requireLocation: boolean;
  status: "DRAFT" | "SCHEDULED" | "BLASTING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  messageTemplateUsed: string;
  attendanceReplyTemplate?: string | null;
  blastedAt: string | null;
  blastingCompletedAt: string | null;
  deadlineAt: string;
  totalTarget: number;
  totalSent: number;
  totalFailed: number;
  totalAttended: number;
  totalAbsent: number;
  createdAt: string;
  area?: {
    id: string;
    name: string;
    code: string;
  } | null;
  config?: {
    id: string;
    title: string;
  } | null;
};

export type ApelMapAttendanceItem = {
  id: string;
  jaringId: string;
  code?: string;
  aliasName: string;
  fullName: string | null;
  whatsappNumber: string;
  caretaker: string;
  caretakerId: string | null;
  areaId: string | null;
  areaName: string;
  sentStatus: "PENDING" | "SENT" | "FAILED";
  sentAt: string | null;
  attendanceStatus: "PENDING" | "PRESENT" | "LATE" | "ABSENT";
  attendedAt: string | null;
  responseDurationSeconds: number | null;
  responseDurationFormatted: string | null;
  minutesBeforeDeadline: number | null;
  isNearDeadline: boolean;
  isLate: boolean;
  replyContent: string | null;
  latitude: number | null;
  longitude: number | null;
  coordinateSource: "WHATSAPP_LOCATION" | "DEVICE_GPS" | "SYSTEM_DERIVED" | null;
};

export type ApelBroadcastArea = {
  id: string;
  code: string;
  name: string;
  level: string;
};

export type ApelBroadcastGaswil = {
  id: string;
  name: string;
  phoneNumber: string | null;
  areaName: string;
  totalJarings: number;
  jaringIds: string[];
};

export type ApelBroadcastJaring = {
  id: string;
  code: string;
  name: string;
  fullName: string | null;
  aliasName: string | null;
  category: string;
  whatsappNumber: string;
  areaId: string | null;
  areaName: string;
  caretakerAssignmentId: string | null;
  caretakerName: string;
};

export type ApelBroadcastTargetsResponse = {
  areas: ApelBroadcastArea[];
  gaswils: ApelBroadcastGaswil[];
  jarings: ApelBroadcastJaring[];
};

export type ApelMapDataResponse = {
  session: {
    id: string;
    title: string;
    sessionDate: string;
    status: string;
    blastedAt: string | null;
    deadlineAt: string;
    areaId?: string | null;
    areaName: string;
    requireLocation?: boolean;
  } | null;
  kpi: {
    totalTarget: number;
    totalHadir: number;
    totalBelum: number;
    persentaseHadir: number;
    isDeadlinePassed: boolean;
    remainingMinutes: number;
    nearDeadlineCount: number;
    totalSent: number;
    totalFailed: number;
    totalPendingDelivery: number;
    deliveryPercentage: number;
    totalVerifiedJarings?: number;
  };
  attendances: ApelMapAttendanceItem[];
  availableSessions?: Array<{
    id: string;
    title: string;
    sessionDate: string;
    areaId: string | null;
    status: string;
    area?: { id: string; name: string } | null;
  }>;
  availableAreas?: Array<{
    id: string;
    name: string;
    code: string;
    level: string;
    parentId?: string | null;
  }>;
};

export async function getApelConfigs(cookie: string) {
  return backendApi<ApelConfigItem[]>("/apel/configs", { cookie });
}

export async function createApelConfig(cookie: string, body: Record<string, unknown>) {
  return backendApi<ApelConfigItem>("/apel/configs", {
    cookie,
    method: "POST",
    body,
  });
}

export async function updateApelConfig(cookie: string, id: string, body: Record<string, unknown>) {
  return backendApi<ApelConfigItem>(`/apel/configs/${id}`, {
    cookie,
    method: "PATCH",
    body,
  });
}

export async function deleteApelConfig(cookie: string, id: string) {
  return backendApi<{ success: boolean }>(`/apel/configs/${id}`, {
    cookie,
    method: "DELETE",
  });
}

export async function triggerApelBlast(cookie: string, body: Record<string, unknown>) {
  return backendApi<ApelSessionItem>("/apel/trigger-blast", {
    cookie,
    method: "POST",
    body,
  });
}

export async function getApelSessions(cookie: string, query?: Record<string, string | number>) {
  return backendApi<{
    items: ApelSessionItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>("/apel/sessions", { cookie, query });
}

export async function getApelBroadcastTargets(cookie: string) {
  return backendApi<ApelBroadcastTargetsResponse>("/apel/broadcast-targets", { cookie });
}

export async function getApelMapData(cookie: string, params?: { sessionId?: string; date?: string; areaId?: string }) {
  const query: Record<string, string> = {};
  if (params?.sessionId) query.sessionId = params.sessionId;
  if (params?.date) query.date = params.date;
  if (params?.areaId) query.areaId = params.areaId;

  return backendApi<ApelMapDataResponse>("/apel/map-data", {
    cookie,
    query: Object.keys(query).length > 0 ? query : undefined,
  });
}

export type AdministrativeAreaOption = {
  id: string;
  name: string;
  code: string;
  level: string;
  parentId?: string | null;
};

export async function getAreaChildren(cookie: string, areaId: string) {
  return backendApi<AdministrativeAreaOption[]>(`/administrative-areas/${areaId}/children`, {
    cookie,
  });
}
