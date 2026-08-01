export type VerificationStatus =
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
    title?: string | null;
    originalContent?: string | null;
    normalizedContent?: string | null;
    urgency?: PriorityLevel | null;
    fieldOfficerNote?: string | null;
    eventTime?: string | null;
  } | null;
};

export type JaringReportSessionDetail = {
  id: string;
  reportSessionId: string;
  jaringId: string;
  referenceNumber?: string | null;
  status: string;
  currentState?: string | null;
  verificationStatus: VerificationStatus;
  displayStatus: VerificationStatus;
  canFillMetadata: boolean;
  title?: string | null;
  content?: string | null;
  normalizedContent?: string | null;
  incidentAt?: string | null;
  startedAt?: string | null;
  lastActivityAt?: string | null;
  expiresAt?: string | null;
  submittedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  timezone?: string | null;
  location?: JaringReportLocation | null;
  reportCategory?: ReportCategoryOption | null;
  urgency?: PriorityLevel | null;
  fieldOfficerNote?: string | null;
  resolvedArea?: {
    id: string;
    code: string;
    officialCode?: string | null;
    name: string;
    level: string;
  } | null;
  media?: ReportMediaItem[];
  submittedMessage?: SubmittedMessageInfo | null;
  baket?: BaketInfo | null;
  jaringAlias?: string | null;
  jaringCode?: string | null;
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
