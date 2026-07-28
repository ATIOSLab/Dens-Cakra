export type AccessContext = {
  primaryAssignmentId: string;
  userProfileId: string;
  positionId: string;
  positionTitle: string;
  organizationUnitId: string;
  organizationUnitName: string;
  authRole: string;
  areaScopes: Array<{
    areaId: string;
    code: string;
    name: string;
    level: string;
    isPrimary: boolean;
  }>;
  permissions: string[];
};

export type FieldOfficerTask = {
  assignmentId: string;
  taskId: string;
  title: string;
  description: string;
  coordinatorInstruction: string | null;
  priority: string;
  dueDate: string | null;
  taskStatus: string;
  assignmentStatus: string;
  sourceLabel: string | null;
  targetAreas: string[];
  assignerName: string | null;
  assignerPositionTitle: string | null;
  progressSummary: string;
  classification: string | null;
};

export type FieldOfficerJaring = {
  id: string;
  code: string;
  aliasName: string;
  whatsappNumber: string;
  clusterId: string | null;
  clusterName: string | null;
  status: string;
  registrationStatus: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  reviewedAt: string | null;
  notes: string | null;
  areaNames: string[];
  areaIds: string[];
  messageCount: number;
  baketCount: number;
  fullName: string | null;
  nationalIdNumber: string | null;
  address: string | null;
  birthPlace: string | null;
  birthDate: string | null;
  gender: string | null;
  occupationName: string | null;
  profilePhotoFileId: string | null;
  profilePhotoUrl: string | null;
  workplace: string | null;
  jobTitle: string | null;
  joinedAt: string | null;
  organizationName: string | null;
  politicalAffiliation: string | null;
};

export type JaringCluster = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  jaringCount?: number;
};

export type JaringOccupation = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  jaringCount?: number;
};

export type ReportCategory = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  messageCount?: number;
};

export type FieldOfficerIncoming = {
  id: string;
  jaringId: string;
  jaringCode: string;
  jaringAlias: string;
  clusterId: string | null;
  clusterName: string | null;
  senderPhone: string;
  title: string | null;
  content: string | null;
  status: string;
  validationSummary: string;
  categoryId: string | null;
  categoryName: string | null;
  urgency: string | null;
  receivedAt: string;
  eventDateTime: string | null;
  gpsSharedAt: string | null;
  processedAt: string | null;
  reportTimestamp: string | null;
  areaName: string | null;
  latitude: number | null;
  longitude: number | null;
  gpsAccuracyMeters: number | null;
  mediaCount: number;
  hasPhoto: boolean;
  photoCaption: string | null;
  photoMessageId: string | null;
  photoFileId: string | null;
  photoUrl: string | null;
};

export type FieldOfficerBaket = {
  id: string;
  status: string;
  createdAt: string;
  primaryJaringId: string | null;
  primaryJaringCode: string | null;
  primaryJaringAlias: string | null;
  currentVersionId: string | null;
  currentVersionTitle: string | null;
  summary: string | null;
  categoryName: string | null;
  clusterName: string | null;
  urgency: string | null;
  sentToPositionTitle: string | null;
};

export type FieldOfficerLocation = {
  id: string;
  latitude: number;
  longitude: number;
  capturedAt: string;
  gpsAccuracyMeters: number | null;
  areaName: string | null;
};

export type JaringInstructionDispatch = {
  id: string;
  assignmentId: string;
  taskId: string;
  status: string;
  instruction: string;
  recipientCount: number;
  recipients: Array<{
    id: string;
    code: string;
    aliasName: string | null;
    whatsappNumber: string;
  }>;
  createdAt: string;
};

export type FieldOfficerWorkspace = {
  context: AccessContext;
  profile: {
    name: string;
    email: string;
    role: string;
  };
  jaring: FieldOfficerJaring[];
  jaringClusters: JaringCluster[];
  occupations: JaringOccupation[];
  districtAreas: Array<{
    areaId: string;
    code: string;
    officialCode?: string | null;
    name: string;
    level: string;
    parentAreaId?: string | null;
    parentOfficialCode?: string | null;
  }>;
  villageAreas: Array<{
    areaId: string;
    code: string;
    officialCode?: string | null;
    name: string;
    level: string;
    parentAreaId?: string | null;
    parentOfficialCode?: string | null;
  }>;
  reportCategories: ReportCategory[];
  jaringReports: FieldOfficerIncoming[];
  incoming: FieldOfficerIncoming[];
  baketCandidates: FieldOfficerIncoming[];
  tasks: FieldOfficerTask[];
  bakets: FieldOfficerBaket[];
  latestLocation: FieldOfficerLocation | null;
};

export type WhatsappControlChannel = {
  id: string;
  code: string;
  name: string;
  status: string;
  lastHealthAt: string | null;
  updatedAt: string;
  webhookConfigured: boolean;
  provider: string | null;
  botLabel: string | null;
  pairingMethod: "qr" | "code";
  botPhoneNumber: string | null;
  connectionStatus: string;
  qrCodeDataUrl: string | null;
  pairingCode: string | null;
  sessionJid: string | null;
  lastConnectedAt: string | null;
  lastDisconnectedAt: string | null;
  lastError: string | null;
  senderNumbers: string[];
  userId?: string | null;
  coordinatorName?: string | null;
  coordinatorRegion?: string | null;
};
