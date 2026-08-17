import type { JaringIdentitySource } from "@/lib/domain/jaring-identity";

export type PriorityLevel = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type BaketStatus =
  | "DRAFT"
  | "READY_TO_SEND"
  | "SENT_TO_OIM"
  | "UNDER_VERIFICATION"
  | "NEEDS_DEVELOPMENT"
  | "VERIFIED"
  | "REJECTED";

export const ALL_BAKET_STATUSES: BaketStatus[] = [
  "DRAFT",
  "READY_TO_SEND",
  "SENT_TO_OIM",
  "UNDER_VERIFICATION",
  "NEEDS_DEVELOPMENT",
  "VERIFIED",
  "REJECTED",
];

export const ALL_BAKET_STATUS_QUERY = ALL_BAKET_STATUSES.join(",");

export type BaketArea = {
  id?: string;
  name?: string | null;
  level?: string | null;
  parent?: BaketArea | null;
};

export type BaketVersion = {
  id: string;
  versionNumber: number;
  displayTitle?: string | null;
  originalContent?: string | null;
  normalizedContent?: string | null;
  urgency?: PriorityLevel | null;
  fieldOfficerNote?: string | null;
  reportedAt?: string | null;
  createdAt?: string | null;
  eventArea?: BaketArea | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  verification?: {
    id?: string;
    status?: string | null;
    sourceReliability?: string | null;
    informationCredibility?: string | null;
    summary?: string | null;
  } | null;
  sourceMessages?: Array<{
    messageId?: string;
    message?: {
      id?: string;
      content?: string | null;
      referenceNumber?: string | null;
      receivedAt?: string | null;
      jaring?: {
        id?: string | null;
        aliasName?: string | null;
        fullName?: string | null;
        whatsappNumber?: string | null;
      } | null;
    } | null;
  }>;
  attachments?: Array<{
    fileId?: string | null;
    caption?: string | null;
    file?: {
      id?: string;
      originalName?: string | null;
      mimeType?: string | null;
    } | null;
  }>;
};

export type BaketRecord = {
  id: string;
  status: BaketStatus | string;
  currentVersionNumber: number;
  primaryJaringId?: string | null;
  primaryJaring?: {
    id?: string | null;
    aliasName?: string | null;
    fullName?: string | null;
    whatsappNumber?: string | null;
    profilePhotoFileId?: string | null;
  } | null;
  reportCategory?: {
    id?: string | null;
    code?: string | null;
    name?: string | null;
  } | null;
  createdByFieldOfficerAssignment?: {
    id?: string | null;
    userProfile?: {
      id?: string | null;
      fullName?: string | null;
      username?: string | null;
      phone?: string | null;
    } | null;
    areaScopes?: Array<{ area?: BaketArea | null }>;
  } | null;
  versions?: BaketVersion[];
  revisionRequests?: unknown[];
  alerts?: unknown[];
  createdAt: string;
  updatedAt?: string | null;
};

export function currentBaketVersion(item: BaketRecord) {
  return item.versions?.[0] ?? null;
}

export function getBaketDisplayTitle(item: BaketRecord) {
  const version = currentBaketVersion(item);
  const displayTitle = firstText(version?.displayTitle);
  if (displayTitle) return displayTitle;
  return firstText(trimTitle(firstText(version?.normalizedContent, version?.originalContent))) ?? "Baket tanpa isi";
}

export function getBaketContent(item: BaketRecord) {
  const version = currentBaketVersion(item);
  return firstText(version?.normalizedContent, version?.originalContent) ?? "";
}

export function getBaketDate(item: BaketRecord) {
  const version = currentBaketVersion(item);
  return version?.reportedAt ?? version?.createdAt ?? item.updatedAt ?? item.createdAt;
}

export function getBaketReferenceLabel(item: BaketRecord) {
  return getBaketSourceReferenceLabel(item) ?? generateBaketReference(item);
}

export function getBaketSourceReferenceLabel(item: BaketRecord) {
  const version = currentBaketVersion(item);
  for (const source of version?.sourceMessages ?? []) {
    const reference = source.message?.referenceNumber?.trim();
    if (reference) return reference;
  }
  return null;
}

const REFERENCE_CITY_CODES: Record<string, string> = {
  JAKARTA_PUSAT: "PST",
  JAKARTA_UTARA: "UTR",
  JAKARTA_BARAT: "BRT",
  JAKARTA_SELATAN: "SEL",
  JAKARTA_TIMUR: "TMR",
  KEPULAUAN_SERIBU: "KSR",
};

function referenceCityCode(areaName?: string | null) {
  if (!areaName) return "WLY";
  const normalized = areaName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return REFERENCE_CITY_CODES[normalized] ?? normalized.slice(0, 3).padEnd(3, "X");
}

function referenceDateKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "00000000";
  const wib = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const yyyy = wib.getUTCFullYear();
  const mm = String(wib.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(wib.getUTCDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

function generateBaketReference(item: BaketRecord) {
  const version = currentBaketVersion(item);
  const dateKey = referenceDateKey(getBaketDate(item));
  const counter = (item.id.replace(/[^0-9a-f]/gi, "").slice(0, 6) || "000000").padEnd(6, "0").toUpperCase();
  return `JKT-${referenceCityCode(version?.eventArea?.name)}-${dateKey}-${counter}`;
}

export function getBaketVersionLabel(item: BaketRecord) {
  return `Versi ${item.currentVersionNumber}`;
}

export function getBaketCategoryId(item: BaketRecord) {
  return item.reportCategory?.id ?? null;
}

export function getBaketHref(item: BaketRecord) {
  return `/dashboard/baket/${item.id}`;
}

export function getBaketStatusLabel(status?: string | null) {
  switch ((status ?? "").toUpperCase()) {
    case "DRAFT":
      return "Draf";
    case "READY_TO_SEND":
      return "Siap Dikirim";
    case "SENT_TO_OIM":
      return "Dikirim ke OIM";
    case "UNDER_VERIFICATION":
      return "Dalam Penilaian";
    case "NEEDS_DEVELOPMENT":
      return "Perlu Pengembangan";
    case "VERIFIED":
      return "Baket Tervalidasi";
    case "REJECTED":
      return "Ditolak";
    default:
      return firstText(status) ?? "Belum tersedia";
  }
}

export function formatBaketAreaName(area?: BaketArea | null) {
  if (!area?.name) return "-";
  const parts: string[] = [];
  const seen = new Set<string>();
  let current: BaketArea | null | undefined = area;

  while (current?.name) {
    const normalized = current.name.trim();
    const key = `${current.id ?? ""}:${normalized.toLocaleLowerCase("id-ID")}`;
    if (normalized && !seen.has(key)) {
      parts.push(normalized);
      seen.add(key);
    }
    current = current.parent;
  }

  return parts.join(", ") || "-";
}

export function getBaketJaringIdentitySource(item: BaketRecord): JaringIdentitySource {
  const fieldOfficer = item.createdByFieldOfficerAssignment;
  const profile = fieldOfficer?.userProfile;
  const primaryJaring = item.primaryJaring;

  return {
    id: primaryJaring?.id ?? item.primaryJaringId,
    fullName: primaryJaring?.fullName,
    aliasName: primaryJaring?.aliasName,
    whatsappNumber: primaryJaring?.whatsappNumber,
    profilePhotoFileId: primaryJaring?.profilePhotoFileId,
    fieldOfficerName: profile?.fullName ?? profile?.username,
    fieldOfficerAssignmentId: fieldOfficer?.id,
    fieldOfficerUserProfileId: profile?.id,
    assignedArea: fieldOfficer?.areaScopes?.[0]?.area ?? null,
  };
}

function trimTitle(value?: string | null) {
  const words = value?.replace(/\s+/g, " ").trim().split(" ").filter(Boolean) ?? [];
  if (words.length === 0) return "";
  const headline = words.slice(0, 8).join(" ");
  return words.length > 8 ? `${headline}...` : headline;
}

function firstText(...values: Array<string | null | undefined>) {
  return values.find((value) => value?.trim())?.trim();
}
