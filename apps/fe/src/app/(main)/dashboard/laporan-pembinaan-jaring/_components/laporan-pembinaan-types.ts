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
  villageName?: string;
}

export interface CreateCoachingReportPayload {
  title: string;
  content: string;
  reportedAt: string;
}

export type PeriodeFilterOption = "ALL" | "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "THIS_MONTH" | "CUSTOM";
