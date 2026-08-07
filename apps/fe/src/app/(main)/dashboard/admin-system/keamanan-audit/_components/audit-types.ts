export type SecuritySessionRecord = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  username: string | null;
  fullName: string | null;
  lastLoginAt: string | null;
  profileStatus: string | null;
  ipAddress: string | null;
  locationLabel: string | null;
  userAgent: string | null;
  lastSeenAt: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  isCurrentSession: boolean;
  isOnline: boolean;
};

export type AuditFacet = { value: string | null; label?: string; count: number };

export type AuditLogRecord = {
  id: string;
  action: string;
  category: string;
  severity: string;
  outcome: string;
  entityType: string;
  entityId: string | null;
  beforeData: unknown;
  afterData: unknown;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  deviceInfo: string | null;
  deviceType: string | null;
  browser: string | null;
  operatingSystem: string | null;
  locationLabel: string | null;
  requestId: string | null;
  sessionId: string | null;
  httpMethod: string | null;
  requestPath: string | null;
  statusCode: number | null;
  durationMs: number | null;
  source: string | null;
  riskScore: number;
  isAnomaly: boolean;
  isIncident: boolean;
  riskIndicators: string[] | null;
  createdAt: string;
  actorUser: {
    id: string;
    username: string | null;
    fullName: string | null;
    status: string;
  } | null;
  actorAssignment: {
    id: string;
    branch: string;
    role: { id: string; code: string; name: string };
    areaScopes: Array<{
      isPrimary: boolean;
      area: { id: string; code: string; name: string; level: string };
    }>;
  } | null;
};

export type AuditPanelResponse = {
  items: AuditLogRecord[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  summary: {
    total: number;
    incidents: number;
    anomalies: number;
    denied: number;
    failures: number;
    averageRiskScore: number;
  };
  facets: {
    categories: AuditFacet[];
    severities: AuditFacet[];
    outcomes: AuditFacet[];
    actions: AuditFacet[];
    entityTypes: AuditFacet[];
    sources: AuditFacet[];
    devices: AuditFacet[];
    actors: AuditFacet[];
  };
};

export type AuditSearchParams = Record<string, string | string[] | undefined>;
