import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";

export type AccessAreaScope = {
  areaId: string;
  code: string;
  name: string;
  level: string;
  isPrimary: boolean;
};

export type AccessContextResource = {
  user?: {
    id?: string;
    email?: string;
    name?: string;
    role?: string;
  } | null;
  availableRoles?: string[];
  authorizationContext: {
    authUserId: string;
    authRole: string;
    userProfileId: string;
    primaryAssignmentId: string;
    positionId: string;
    positionTitle: string;
    roleCode: string;
    organizationUnitId: string;
    organizationUnitName: string;
    permissions: string[];
    areaScopes: AccessAreaScope[];
  };
};

export type OrganizationUnitOption = {
  id: string;
  code: string;
  name: string;
  type: string;
  branch?: string | null;
};

export type PositionAssignmentOption = {
  id: string;
  userProfile?: {
    fullName?: string | null;
    username?: string | null;
  } | null;
};

export type PositionOption = {
  id: string;
  seatCode: string;
  code?: string | null;
  title: string;
  branch?: string | null;
  role?: {
    code?: string;
    name?: string;
  } | null;
  organizationUnit?: {
    id: string;
    name: string;
  } | null;
  assignments?: PositionAssignmentOption[];
};

export type AreaNode = {
  id: string;
  code: string;
  name: string;
  level: string;
  parentId?: string | null;
  children?: AreaNode[];
};

export type ProvinceOption = {
  id: string;
  code: string;
  name: string;
  level: string;
  hasActiveBoundary?: boolean;
};

export type ProvinceBoundaryProperties = {
  areaId: string;
  name: string;
  code?: string;
  level?: string;
  selected?: boolean;
  hasRecipient?: boolean;
  recipientCount?: number;
};

export type ProvinceBoundaryFeature = Feature<Polygon | MultiPolygon, ProvinceBoundaryProperties>;

export type ProvinceBoundaryCollection = FeatureCollection<Polygon | MultiPolygon, ProvinceBoundaryProperties>;

export type RegionalMasterBinda = {
  unitId: string;
  code: string;
  name: string;
  parentUnitId: string | null;
  parentUnitCode: string | null;
  parentUnitName: string | null;
};

export type RegionalMasterDirectorate = {
  unitId: string;
  code: string;
  name: string;
  profileCode: string | null;
  parentUnitId: string | null;
  parentUnitCode: string | null;
  parentUnitName: string | null;
  primaryProvinceAreaId: string | null;
  coverageAreas: Array<{
    areaId: string;
    code: string;
    name: string;
    level: string;
    isPrimary: boolean;
  }>;
};

export type RegionalMasterProvinceSummary = {
  province: ProvinceOption & {
    isActive?: boolean;
    centroidLatitude?: number | null;
    centroidLongitude?: number | null;
  };
  binda: RegionalMasterBinda | null;
  directorates: RegionalMasterDirectorate[];
};

export type RegionalMasterOverview = {
  totals: {
    provinceCount: number;
    bindaCount: number;
    directorateCount: number;
    coveredProvinceCount: number;
  };
  deputyOptions: Array<{
    id: string;
    code: string;
    name: string;
  }>;
  provinces: RegionalMasterProvinceSummary[];
};

export type RegionalAssignmentOption = {
  id: string;
  positionId: string;
  positionTitle: string;
  positionCode: string;
  organizationUnitId: string;
  organizationUnitName: string;
  assigneeName?: string | null;
  assigneeUsername?: string | null;
  areaScopes: AccessAreaScope[];
};

export type RegionalRecipientPreview = {
  provinceId: string;
  provinceCode: string;
  provinceName: string;
  recipients: RegionalAssignmentOption[];
};

export type DirectiveRecipientResource = {
  id: string;
  status: string;
  targetUnitId?: string | null;
  targetPositionId?: string | null;
  targetUnit?: OrganizationUnitOption | null;
  targetPosition?: PositionOption | null;
  sentAt?: string | null;
  acknowledgedAt?: string | null;
};

export type DirectiveVersionResource = {
  id: string;
  versionNumber: number;
  classification: string;
  urgency?: string | null;
  commandSource: string;
  commandIssuer: string;
  commandDate: string;
  dueDate?: string | null;
  strategicIssue?: string | null;
  commandDescription: string;
  changeReason?: string | null;
  targetAreas: Array<{
    areaId: string;
    isPrimary: boolean;
    area: {
      id: string;
      code: string;
      name: string;
      level: string;
    };
  }>;
  recipients: DirectiveRecipientResource[];
  tasks?: Array<{
    id: string;
    title: string;
    status: string;
    ownerUnitId: string;
    ownerUnit?: OrganizationUnitOption | null;
    assignments?: Array<{
      id: string;
      status: string;
      assignerAssignmentId: string;
      assigneeAssignmentId: string;
    }>;
  }>;
  uukStrs?: Array<{
    id: string;
    status: string;
    ownerUnit?: OrganizationUnitOption | null;
    versions?: Array<{
      id: string;
      versionNumber: number;
      title: string;
    }>;
  }>;
};

export type DirectiveSummary = {
  id: string;
  commandNumber: string;
  status: string;
  currentVersionNumber: number;
  ownerUnit?: OrganizationUnitOption | null;
  versions: DirectiveVersionResource[];
};

export type DirectiveDetail = DirectiveSummary & {
  createdByAssignment?: {
    id?: string;
    userProfile?: {
      fullName?: string | null;
    } | null;
    position?: {
      title?: string | null;
    } | null;
  } | null;
};

export type DirectiveTracking = {
  directiveId: string;
  versionId?: string | null;
  recipientSummary: Record<string, number>;
  taskSummary: Record<string, number>;
  stageSummary: {
    regional: {
      totalRecipients: number;
      readCount: number;
      acknowledgedCount: number;
      forwardedCount: number;
      failedCount: number;
    };
    oim: {
      totalForwardedRegionalStr: number;
      readCount: number;
      taskCount: number;
      forwardedToFieldCoordinatorCount: number;
    };
    fieldCoordinator: {
      totalAssignments: number;
      readCount: number;
      acknowledgedCount: number;
      distributedCount: number;
    };
    korwil: {
      total: number;
      sent: number;
      read: number;
      acknowledged: number;
      inProgress: number;
      completed: number;
      overdue: number;
      reassigned: number;
      cancelled: number;
    };
  };
  baketCount: number;
  targetAreas: Array<{
    areaId: string;
    isPrimary: boolean;
    code: string;
    name: string;
    level: string;
  }>;
  routingHierarchy: Array<{
    positionId: string;
    reportsToPositionId?: string | null;
    seatCode: string;
    positionCode: string;
    positionTitle: string;
    branch?: string | null;
    roleCode: string;
    organizationUnitId: string;
    organizationUnitCode: string;
    organizationUnitName: string;
    organizationUnitType: string;
    assignmentId?: string | null;
    fullName?: string | null;
    username?: string | null;
    areaScopes: Array<{
      areaId: string;
      code: string;
      name: string;
      level: string;
      isPrimary: boolean;
    }>;
  }>;
  regionalChains: Array<{
    regionalRecipient: {
      id: string;
      status: string;
      sentAt: string;
      deliveredAt?: string | null;
      readAt?: string | null;
      acknowledgedAt?: string | null;
      failureReason?: string | null;
      targetUnit?: OrganizationUnitOption | null;
      targetPosition?: {
        id: string;
        code?: string | null;
        title: string;
        seatCode: string;
        branch?: string | null;
        role?: {
          code?: string | null;
          name?: string | null;
        } | null;
        organizationUnit?: {
          id: string;
          code?: string | null;
          name: string;
          type?: string | null;
          branch?: string | null;
        } | null;
        assigneeName?: string | null;
        assigneeUsername?: string | null;
      } | null;
    };
    forwarding?: {
      id: string;
      status: string;
      createdAt: string;
      updatedAt: string;
      ownerUnitId: string;
      ownerUnit?: OrganizationUnitOption | null;
      createdBy?: {
        assignmentId?: string | null;
        fullName?: string | null;
        username?: string | null;
        positionId?: string | null;
        positionCode?: string | null;
        positionTitle?: string | null;
        branch?: string | null;
        organizationUnitId?: string | null;
        organizationUnitCode?: string | null;
        organizationUnitName?: string | null;
        organizationUnitType?: string | null;
        roleCode?: string | null;
      } | null;
      currentVersion?: {
        id: string;
        versionNumber: number;
        title: string;
        createdAt: string;
        createdBy?: {
          assignmentId?: string | null;
          fullName?: string | null;
          positionTitle?: string | null;
        } | null;
      } | null;
    } | null;
    oimStage: {
      hasRead: boolean;
      taskCount: number;
      hasForwardedToFieldCoordinator: boolean;
      fieldCoordinatorAssignmentCount: number;
    };
    fieldCoordinatorStage: {
      totalAssignments: number;
      readCount: number;
      distributedCount: number;
    };
    korwilStage: {
      total: number;
      sent: number;
      read: number;
      acknowledged: number;
      inProgress: number;
      completed: number;
      overdue: number;
      reassigned: number;
      cancelled: number;
    };
    oimTasks?: DirectiveTrackingTask[];
  }>;
  tasks?: DirectiveTrackingTask[];
  unlinkedTasks?: DirectiveTrackingTask[];
};

export type DirectiveTrackingActor = {
  assignmentId: string;
  fullName?: string | null;
  username?: string | null;
  positionId?: string | null;
  positionCode?: string | null;
  positionTitle?: string | null;
  branch?: string | null;
  organizationUnitId?: string | null;
  organizationUnitCode?: string | null;
  organizationUnitName?: string | null;
  organizationUnitType?: string | null;
  roleCode?: string | null;
  areaScopes: Array<{
    areaId: string;
    code?: string | null;
    name: string;
    level: string;
    isPrimary: boolean;
  }>;
};

export type DirectiveTrackingAssignment = {
  id: string;
  status: string;
  assignedAt: string;
  readAt?: string | null;
  acknowledgedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  dueDate?: string | null;
  assignmentNote?: string | null;
  assigner?: DirectiveTrackingActor | null;
  assignee?: DirectiveTrackingActor | null;
  downstreamAssignments?: DirectiveTrackingAssignment[];
};

export type DirectiveTrackingTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  dueDate?: string | null;
  ownerUnitId: string;
  ownerUnit?: OrganizationUnitOption | null;
  createdBy?: {
    assignmentId?: string | null;
    fullName?: string | null;
    username?: string | null;
    positionId?: string | null;
    positionCode?: string | null;
    positionTitle?: string | null;
    branch?: string | null;
    organizationUnitId?: string | null;
    organizationUnitCode?: string | null;
    organizationUnitName?: string | null;
    organizationUnitType?: string | null;
    roleCode?: string | null;
  } | null;
  targetAreas: Array<{
    areaId: string;
    isPrimary: boolean;
    area: {
      id: string;
      code: string;
      name: string;
      level: string;
    };
  }>;
  oimStage: {
    hasRead: boolean;
    hasForwardedToFieldCoordinator: boolean;
    fieldCoordinatorAssignmentCount: number;
  };
  fieldCoordinatorSummary: {
    total: number;
    sent: number;
    read: number;
    acknowledged: number;
    inProgress: number;
    completed: number;
    overdue: number;
    reassigned: number;
    cancelled: number;
    distributed: number;
  };
  korwilSummary: {
    total: number;
    sent: number;
    read: number;
    acknowledged: number;
    inProgress: number;
    completed: number;
    overdue: number;
    reassigned: number;
    cancelled: number;
  };
  fieldCoordinatorAssignments?: DirectiveTrackingAssignment[];
  uukStr?: {
    id: string;
    ownerUnitId: string;
    ownerUnit?: OrganizationUnitOption | null;
    versionId: string;
    versionNumber: number;
    title: string;
  } | null;
};

export type DirectiveRecipientInput = {
  targetUnitId?: string;
  targetPositionId?: string;
};

export type AreaOption = {
  id: string;
  label: string;
  level: string;
};
