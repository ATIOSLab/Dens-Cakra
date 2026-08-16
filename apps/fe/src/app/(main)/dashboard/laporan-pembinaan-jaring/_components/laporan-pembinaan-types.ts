export interface CoachingReportFieldOfficer {
  assignmentId: string;
  role?: {
    code: string;
    name: string;
  } | null;
  userProfile?: {
    id: string;
    username: string;
    fullName: string;
    phone?: string | null;
  } | null;
}

export interface CoachingReportItem {
  id: string;
  jaringId: string;
  title: string;
  content: string;
  reportedAt: string;
  createdAt: string;
  updatedAt: string;
  fieldOfficer?: CoachingReportFieldOfficer | null;

  // Enriched fields for main table/card view
  jaringCode?: string;
  jaringAlias?: string;
  jaringName?: string;
  jaringWhatsAppNumber?: string | null;
  jaringProfilePhotoFileId?: string | null;
  villageName?: string;
  assignedArea?: {
    id: string;
    name: string;
    level: string;
    code?: string | null;
    officialCode?: string | null;
    parent?: CoachingReportItem["assignedArea"] | null;
  } | null;
  attachments?: Array<{
    fileId: string;
    caption?: string | null;
    fileName?: string | null;
    mimeType?: string | null;
  }>;
}

export interface CreateCoachingReportPayload {
  title: string;
  content: string;
  reportedAt: string;
}

export type PeriodeFilterOption = "ALL" | "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "THIS_MONTH" | "CUSTOM";
