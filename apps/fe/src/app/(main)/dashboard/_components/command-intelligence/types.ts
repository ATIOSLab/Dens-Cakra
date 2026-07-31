import type { SystemRole } from "@/navigation/sidebar/system-roles";

export type JaringRegistrationStatus = "PENDING" | "APPROVED" | "REJECTED";
export type JaringOperationalStatus = "ACTIVE" | "INACTIVE" | "TRANSFERRED" | "ARCHIVED";
export type JaringActivityLevel = "VERY_ACTIVE" | "ACTIVE" | "DORMANT" | "NEVER_REPORTED";
export type FieldIntelligencePeriod = "7d" | "30d" | "90d" | "all";

export type DashboardArea = {
  id: string;
  code: string;
  name: string;
  level: string;
};

export type DashboardReportVersion = {
  id: string;
  title: string;
  originalContent?: string | null;
  normalizedContent?: string | null;
  eventTime: string | null;
  urgency: string;
  fieldOfficerNote?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  gpsAccuracyMeters?: string | number | null;
  locationCapturedAt?: string | null;
  coordinateSource?: string | null;
  eventArea?: DashboardArea | null;
};

export type DashboardReport = {
  id: string;
  status: string;
  createdAt: string;
  currentVersionNumber?: number;
  primaryJaringId?: string | null;
  category?: { id: string; code: string; name: string } | null;
  reportCategory?: { id: string; code: string; name: string } | null;
  version?: DashboardReportVersion | null;
  versions?: DashboardReportVersion[];
  jaring?: {
    id: string;
    code: string;
    aliasName: string | null;
    fullName: string | null;
    registrationStatus: JaringRegistrationStatus;
  } | null;
};

export type FieldIntelligenceJaring = {
  id: string;
  code: string;
  aliasName: string | null;
  whatsappNumber: string;
  fullName: string | null;
  nationalIdNumber: string | null;
  address: string | null;
  birthPlace: string | null;
  birthDate: string | null;
  gender: "MALE" | "FEMALE" | null;
  workplace: string | null;
  jobTitle: string | null;
  joinedAt: string | null;
  organizationName: string | null;
  politicalAffiliation: string | null;
  status: JaringOperationalStatus;
  registrationStatus: JaringRegistrationStatus;
  rejectionReason: string | null;
  notes: string | null;
  registeredAt: string;
  reviewedAt: string | null;
  profilePhotoFileId: string | null;
  occupation: { id: string; code: string; name: string } | null;
  handler: {
    assignmentId: string;
    userProfileId: string;
    name: string;
    positionTitle: string;
    organizationUnit: { id: string; name: string };
  } | null;
  area: {
    id: string;
    code: string;
    name: string;
    level: string;
    latitude: number | null;
    longitude: number | null;
    path: DashboardArea[];
    pathLabel: string;
  } | null;
  activity: {
    level: JaringActivityLevel;
    lifetimeReports: number;
    periodReports: number;
    verifiedReports: number;
    unverifiedReports: number;
    lastReportAt: string | null;
    statusCounts: Record<string, number>;
  };
  latestReport: DashboardReport | null;
};

export type FieldIntelligenceDashboard = {
  generatedAt: string;
  period: {
    preset: FieldIntelligencePeriod;
    from: string | null;
    to: string;
    interval: string;
  };
  scope: {
    role: SystemRole;
    positionTitle: string;
    organizationUnit: { id: string; name: string };
    areas: DashboardArea[];
    nationalAccess: boolean;
    includesUnverifiedJaring: boolean;
  };
  summary: {
    totalJaring: number;
    approvedJaring: number;
    pendingJaring: number;
    rejectedJaring: number;
    reportingJaring: number;
    silentJaring: number;
    reportingCoverage: number;
    totalReports: number;
    reportsInPeriod: number;
    verifiedReports: number;
    unverifiedReports: number;
    averageReportsPerActiveJaring: number;
  };
  reportPipeline: Record<string, number>;
  registrationStatuses: Record<string, number>;
  activityStatuses: Record<string, number>;
  trend: Array<{
    bucket: string;
    total: number;
    verified: number;
    unverified: number;
  }>;
  recentReports: DashboardReport[];
  filters: {
    areas: DashboardArea[];
  };
  map: {
    jaring: Array<{
      id: string;
      code: string;
      aliasName: string | null;
      fullName: string | null;
      registrationStatus: JaringRegistrationStatus;
      operationalStatus: JaringOperationalStatus;
      activityLevel: JaringActivityLevel;
      periodReports: number;
      lifetimeReports: number;
      lastReportAt: string | null;
      areaName: string;
      areaPathLabel: string;
      latitude: number;
      longitude: number;
    }>;
    baket: Array<{
      id: string;
      status: string;
      createdAt: string;
      title: string | null;
      urgency: string | null;
      eventTime: string | null;
      originalContent: string | null;
      normalizedContent: string | null;
      fieldOfficerNote: string | null;
      gpsAccuracyMeters: number | null;
      locationCapturedAt: string | null;
      coordinateSource: string | null;
      category: { id: string; code: string; name: string } | null;
      jaring: DashboardReport["jaring"];
      areaName: string | null;
      areaLevel: string | null;
      attachments: Array<{
        fileId: string;
        fileName: string | null;
        mimeType: string;
        fileType: string;
        sizeBytes: number;
        caption: string | null;
      }>;
      latitude: number;
      longitude: number;
    }>;
  };
  jaring: {
    items: FieldIntelligenceJaring[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};

export type FieldIntelligenceFilters = {
  search: string;
  period: FieldIntelligencePeriod;
  registrationStatus: "ALL" | JaringRegistrationStatus;
  activity: "ALL" | JaringActivityLevel;
  urgency: string;
  areaId: string;
  page: number;
};
