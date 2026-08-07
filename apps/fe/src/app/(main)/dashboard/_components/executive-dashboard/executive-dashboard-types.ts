export type DashboardComparison = {
  previous: number;
  delta: number;
  percent: number | null;
};

export type DashboardCard = {
  key: string;
  label?: string;
  description?: string;
  entity?: string;
  dateField?: string;
  drilldown?: string | null;
  value: number;
  share: number | null;
  comparison: DashboardComparison | null;
  tone: string;
};

export type DistributionItem = {
  key: string;
  label: string;
  value: number;
};

export type DashboardReportItem = {
  id: string;
  referenceNumber: string | null;
  title: string;
  jaring: { id: string; name: string };
  area: { id: string; name: string; level: string } | null;
  category: { id: string; name: string } | null;
  urgency: string | null;
  completeness: string;
  verification: string;
  workflow: string;
  reportedAt: string;
  ageHours: number;
  dueAt: string | null;
  followUpCount: number;
  priorityReasons: string[];
  drilldown: string;
};

export type ExecutiveDashboardData = {
  generatedAt: string;
  period: {
    preset: string;
    timezone: string;
    from: string;
    to: string;
    previousFrom: string;
    previousTo: string;
  };
  scope: {
    role: string;
    roleCode: string;
    organizationUnitId: string;
    organizationUnitName: string;
    label: string;
    areas: Array<{ id: string; code: string; name: string; level: string }>;
  };
  appliedFilters: Record<string, string>;
  metrics: Array<{
    key: string;
    label: string;
    description: string;
    entity: string;
    dateField: string;
    denominator: string | null;
    permission: string;
    drilldown: string | null;
  }>;
  overview: {
    cards: DashboardCard[];
    attention: Array<
      DashboardReportItem & {
        type: string;
        reason: string;
        tone: "danger" | "warning";
      }
    >;
  };
  analytics: {
    trend: {
      granularity: string;
      points: Array<{
        bucket: string;
        total: number;
        complete: number;
        incomplete: number;
        verified: number;
      }>;
    };
    workflow: DistributionItem[];
    completeness: DistributionItem[];
    verification: DistributionItem[];
    urgency: DistributionItem[];
    categories: DistributionItem[];
    source: DistributionItem[];
    attachments: DistributionItem[];
    locationSuitability: DistributionItem[];
    locationSource: DistributionItem[];
    products: { total: number; byStatus: DistributionItem[] };
    dataQuality: {
      total: number;
      missingCategory: number;
      unclassified: number;
      missingDescription: number;
      missingLocation: number;
      missingAttachment: number;
      notCheckedLocation: number;
      missingJaringRelation: number;
      jaringWithoutFieldOfficer: number;
      jaringWithoutArea: number;
      incompleteOrganizationRelation: number;
      unavailableFields: Array<{ key: string; label: string; reason: string }>;
      completenessRate: number;
    };
  };
  operations: {
    networkSummary: {
      total: number;
      active: number;
      inactive: number;
      otherStatus: number;
      newlyRegistered: number;
      reporting: number;
      withoutReports: number;
      averageReports: number;
      completenessRate: number;
    };
    regionalRanking: Array<{
      id: string;
      name: string;
      level: string;
      reports: number;
      activeJaring: number;
      verified: number;
      draftBakets: number;
      validatedBakets: number;
      complete: number;
      completenessRate: number;
      urgent: number;
      outsideScope: number;
      attentionReasons: string[];
    }>;
    jaringRanking: Array<{
      id: string;
      name: string;
      status: string;
      registrationStatus: string;
      gaswil: string | null;
      area: string | null;
      reports: number;
      complete: number;
      verified: number;
      draftBakets: number;
      completenessRate: number;
      lastReportAt: string | null;
      drilldown: string;
    }>;
    fieldOfficerRanking: Array<{
      id: string;
      userProfileId: string;
      name: string;
      area: string | null;
      jaring: number;
      activeJaring: number;
      reports: number;
      complete: number;
      incomplete: number;
      verified: number;
      draftBakets: number;
      completenessRate: number;
      averageVerificationHours: number | null;
      lastActivityAt: string | null;
      drilldown: string;
    }>;
    unavailableRankings: Array<{ key: string; label: string; reason: string }>;
    priorityReports: DashboardReportItem[];
    reportViews: {
      mostUrgent: DashboardReportItem[];
      latest: DashboardReportItem[];
      mostFollowedUp: DashboardReportItem[];
      waitingLongest: DashboardReportItem[];
    };
    recentActivity: Array<{
      id: string;
      occurredAt: string;
      actor: string;
      role: string | null;
      unit: string | null;
      action: string;
      entityType: string;
      reference: string | null;
      title: string;
      statusChange: { before: string | null; after: string | null } | null;
      drilldown: string | null;
    }>;
    followUp: {
      tasks: DistributionItem[];
      directives: DistributionItem[];
      pendingApprovals: number;
      summary: {
        total: number;
        notStarted: number;
        inProgress: number;
        completed: number;
        approachingDue: number;
        overdue: number;
      };
      approachingDueDefinitionHours: number;
      items: Array<{
        id: string;
        kind: string;
        title: string;
        referenceNumber?: string;
        sender: string;
        recipient: string | null;
        recipientRole: string | null;
        area: { id: string; name: string; level: string } | null;
        urgency: string;
        status: string;
        dueAt: string | null;
        overdue: boolean;
        progress: number | null;
        createdAt: string;
        drilldown: string;
      }>;
    };
  };
  availability: Record<string, boolean>;
};

export type DashboardAreaNode = {
  id: string;
  name: string;
  level: string;
  children?: DashboardAreaNode[];
};

export type ExecutiveDashboardFilters = {
  scope: ExecutiveDashboardData["scope"];
  categories: Array<{ id: string; code: string; name: string }>;
  productTypes: Array<{ id: string; code: string; name: string }>;
  areaTree: DashboardAreaNode;
  fieldOfficers: Array<{ id: string; name: string }>;
  jaring: {
    items: Array<{ id: string; name: string }>;
    total: number;
    truncated: boolean;
  };
  options: {
    urgency: string[];
    reportStatus: string[];
    completeness: string[];
    verificationStatus: string[];
    workflowStatus: string[];
    validationStatus: string[];
    coordinateSource: string[];
    locationSuitability: string[];
    source: string[];
  };
  unavailableFilters: Array<{ key: string; label: string; reason: string }>;
};

export type DashboardQueryState = {
  period: string;
  from: string;
  to: string;
  areaId: string;
  categoryId: string;
  productTypeId: string;
  jaringId: string;
  fieldOfficerAssignmentId: string;
  urgency: string;
  reportStatus: string;
  completeness: string;
  verificationStatus: string;
  workflowStatus: string;
  validationStatus: string;
  hasAttachment: string;
  coordinateSource: string;
  locationSuitability: string;
  source: string;
};
