export type VerificationStatus =
  | "IN_PROGRESS_BY_JARING"
  | "NOT_SUBMITTED"
  | "WAITING_FIELD_OFFICER_VERIFICATION"
  | "NEEDS_FIELD_OFFICER_REVIEW"
  | "VERIFIED_BY_FIELD_OFFICER"
  | "METADATA_RECORDED";

export type PriorityLevel = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type JaringReportLocation = {
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  capturedAt?: string | null;
  type?: string | null;
};

export type ReportCategoryOption = {
  id: string;
  code?: string | null;
  name: string;
  description?: string | null;
};

export type ReportMediaItem = {
  id: string;
  fileId: string;
  caption?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  url?: string | null;
  fileUrl?: string | null;
};

export type SubmittedMessageInfo = {
  id: string;
  referenceNumber?: string | null;
  status?: string | null;
  validationSummary?: string | null;
  receivedAt?: string | null;
  convertedBaketId?: string | null;
  mediaCount?: number;
  amendmentCount?: number;
};

export type BaketInfo = {
  id: string;
  status: string;
  currentVersionNumber: number;
  latestVersion?: {
    id: string;
    versionNumber: number;
    displayTitle?: string | null;
    originalContent?: string | null;
    normalizedContent?: string | null;
    urgency?: PriorityLevel | null;
    fieldOfficerNote?: string | null;
    reportedAt?: string | null;
  } | null;
};

export type ReportMessageItem =
  | {
      id: string;
      kind: "TEXT";
      text: string;
      sentAt: string;
    }
  | {
      id: string;
      kind: "IMAGE" | "VIDEO";
      fileId: string;
      caption?: string | null;
      fileName?: string | null;
      mimeType?: string | null;
      sentAt: string;
    }
  | {
      id: string;
      kind: "LIVE_LOCATION";
      latitude: number;
      longitude: number;
      accuracyMeters?: number | null;
      sentAt: string;
    };

export type ResolvedAreaDetail = {
  id: string;
  code?: string;
  officialCode?: string | null;
  name: string;
  level?: string;
  parent?: ResolvedAreaDetail | null;
};

export function formatFullAreaName(area?: ResolvedAreaDetail | null): string {
  if (!area || !area.name) return "-";
  const parts: string[] = [];
  let current: ResolvedAreaDetail | null | undefined = area;
  while (current && current.name) {
    parts.push(current.name);
    current = current.parent;
  }
  return parts.join(", ");
}

export type JaringReportSessionDetail = {
  id: string;
  reportSessionId: string;
  jaringId: string;
  referenceNumber?: string | null;
  currentReportVersion?: number;
  reportVersions?: Array<{
    id?: string;
    versionNumber: number;
    amendmentType: string;
    content?: string | null;
    fileId?: string | null;
    file?: {
      id: string;
      originalName?: string | null;
      mimeType?: string | null;
      fileType?: string | null;
    } | null;
    metadata?: Record<string, unknown> | null;
    createdAt: string;
  }>;
  status: string;
  currentState?: string | null;
  verificationStatus: VerificationStatus;
  displayStatus: VerificationStatus;
  completenessStatus?: "COMPLETE" | "INCOMPLETE" | "NOT_DETERMINED";
  completenessIssues?: string[];
  canFillMetadata: boolean;
  displayTitle: string;
  content?: string | null;
  normalizedContent?: string | null;
  reportedAt: string;
  messages?: ReportMessageItem[];
  startedAt?: string | null;
  lastActivityAt?: string | null;
  expiresAt?: string | null;
  submittedAt?: string | null;
  closedAt?: string | null;
  readAt?: string | null;
  isRead?: boolean;
  fieldOfficerReadAt?: string | null;
  isReadByFieldOfficer?: boolean;
  createdAt: string;
  updatedAt?: string | null;
  timezone?: string | null;
  location?: JaringReportLocation | null;
  reportCategory?: ReportCategoryOption | null;
  urgency?: PriorityLevel | null;
  locationSuitabilityStatus?:
    | "NOT_CHECKED"
    | "WITHIN_SCOPE"
    | "OUTSIDE_JARING_SCOPE"
    | "OUTSIDE_FIELD_OFFICER_SCOPE"
    | "OUTSIDE_FIELD_COORDINATOR_SCOPE"
    | "OUTSIDE_UNIT_SCOPE"
    | "BORDER_AMBIGUOUS";
  fieldOfficerNote?: string | null;
  resolvedArea?: ResolvedAreaDetail | null;
  media?: ReportMediaItem[];
  submittedMessage?: SubmittedMessageInfo | null;
  baket?: BaketInfo | null;
  jaringAlias?: string | null;
  jaringFullName?: string | null;
  jaringCode?: string | null;
  jaringWhatsAppNumber?: string | null;
  jaringProfilePhotoFileId?: string | null;
  jaringProfilePhotoUrl?: string | null;
  gaswilName?: string | null;
  gaswilAssignmentId?: string | null;
  gaswilUserProfileId?: string | null;
  placementArea?: ResolvedAreaDetail | null;
  counts?: {
    contentParts?: number;
    media?: number;
    amendments?: number;
  } | null;
};

export type ReportHistoryEvent = {
  id: string;
  source: "report_history" | "audit_log";
  action: string;
  previousState?: string | null;
  newState?: string | null;
  actorUserProfileId?: string | null;
  actorAssignmentId?: string | null;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

export type ReportHistoryResponse = {
  reportSessionId: string;
  events: ReportHistoryEvent[];
};
