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
  priority: string;
  dueDate: string | null;
  taskStatus: string;
  assignmentStatus: string;
  sourceLabel: string | null;
  targetAreas: string[];
  assignerName: string | null;
  progressSummary: string;
};

export type FieldOfficerJaring = {
  id: string;
  code: string;
  aliasName: string;
  whatsappNumber: string;
  status: string;
  notes: string | null;
  areaNames: string[];
  areaIds: string[];
  messageCount: number;
  baketCount: number;
};

export type FieldOfficerIncoming = {
  id: string;
  jaringId: string;
  jaringCode: string;
  jaringAlias: string;
  senderPhone: string;
  title: string | null;
  content: string | null;
  status: string;
  validationSummary: string;
  receivedAt: string;
  areaName: string | null;
  latitude: number | null;
  longitude: number | null;
  gpsAccuracyMeters: number | null;
  mediaCount: number;
  hasPhoto: boolean;
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
};

export type FieldOfficerLocation = {
  id: string;
  latitude: number;
  longitude: number;
  capturedAt: string;
  gpsAccuracyMeters: number | null;
  areaName: string | null;
};

export type FieldOfficerWorkspace = {
  context: AccessContext;
  profile: {
    name: string;
    email: string;
    role: string;
  };
  jaring: FieldOfficerJaring[];
  incoming: FieldOfficerIncoming[];
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
};
