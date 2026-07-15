import type { PaginationMeta } from "@/lib/api/types";

export type PersonnelArea = {
  id: string;
  code: string;
  name: string;
  level: string;
  isPrimary?: boolean;
};

export type PersonnelAssignment = {
  id: string;
  positionId: string;
  title: string;
  seatCode: string;
  roleCode: string;
  roleName: string;
  positionCode: string;
  unit: {
    id: string;
    code: string;
    name: string;
    type: string;
    branch: string | null;
  };
  branch: string | null;
  validFrom: string;
  validUntil?: string | null;
  isPrimary?: boolean;
  isActive?: boolean;
  areas: PersonnelArea[];
  lastLocation?: PersonnelLocation | null;
};

export type PersonnelLocation = {
  latitude: number;
  longitude: number;
  gpsAccuracyMeters: number | null;
  coordinateSource: string;
  capturedAt: string;
  receivedAt: string;
  area: Omit<PersonnelArea, "isPrimary"> | null;
};

export type PersonnelListItem = {
  id: string;
  username: string | null;
  fullName: string | null;
  email: string;
  phone: string | null;
  status: string;
  isActive: boolean;
  authRole: string;
  authBanned: boolean;
  lastLoginAt: string | null;
  assignment: PersonnelAssignment | null;
  lastLocation: PersonnelLocation | null;
  reportCount: number;
};

export type PersonnelMapFeature = {
  type: "Feature";
  id: string;
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    assignmentId: string;
    userProfileId: string;
    name: string | null;
    email: string;
    positionTitle: string;
    seatCode: string;
    unitName: string;
    roleCode: string;
    status: string;
    markerCode: string;
    markerColor: string;
    hasLiveLocation: boolean;
    capturedAt: string | null;
    area: Omit<PersonnelArea, "isPrimary"> | null;
  };
};

export type PersonnelMapPayload = {
  type: "FeatureCollection";
  features: PersonnelMapFeature[];
  meta: {
    counts: {
      totalFieldOfficers: number;
      located: number;
      unlocated: number;
      byStatus: Record<string, number>;
    };
    legend: Array<{
      code: string;
      status: string;
      label: string;
      description: string;
      color: string;
    }>;
    freshness: {
      activeWithinMinutes: number;
      recentWithinHours: number;
      generatedAt: string;
    };
  };
};

export type PersonnelDetail = {
  profile: Omit<PersonnelListItem, "assignment" | "lastLocation" | "reportCount"> & {
    operationalLockedAt: string | null;
    operationalLockReason: string | null;
    authBanReason: string | null;
    authBanExpires: string | null;
    createdAt: string;
    updatedAt: string;
  };
  currentAssignment: PersonnelAssignment | null;
  assignments: PersonnelAssignment[];
  activityLogs: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    ipAddress: string | null;
    createdAt: string;
  }>;
  reports: Array<{
    id: string;
    status: string;
    currentVersionNumber: number;
    category: { id: string; code: string; name: string } | null;
    title: string;
    urgency: string | null;
    eventTime: string | null;
    eventArea: Omit<PersonnelArea, "isPrimary"> | null;
    createdAt: string;
    updatedAt: string;
  }>;
  kpi: {
    status: string;
    metrics: unknown[];
    note: string;
  };
};

export type PersonnelListQueryState = {
  q: string;
  provinceId: string;
  regencyId: string;
  districtId: string;
  page: number;
  limit: number;
};

export type PersonnelAreaOption = {
  id: string;
  code: string;
  name: string;
  level: string;
  parentId: string | null;
};

export type PersonnelListProps = {
  items: PersonnelListItem[];
  map: PersonnelMapPayload;
  pagination?: PaginationMeta;
  queryState: PersonnelListQueryState;
  areaFilters: {
    provinces: PersonnelAreaOption[];
    regencies: PersonnelAreaOption[];
    districts: PersonnelAreaOption[];
  };
};
