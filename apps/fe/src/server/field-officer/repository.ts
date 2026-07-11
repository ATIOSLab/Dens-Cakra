import {
  DEFAULT_FIELD_OFFICER_ID,
  type BaketDraft,
  type FieldOfficer,
  type FieldOfficerWorkspace,
  type FieldTask,
  type IncomingInformation,
  type IncomingStatus,
  type JaringSource,
  type LocationPin,
  type WhatsappUser,
} from "./types";

interface FieldOfficerState {
  fieldOfficers: FieldOfficer[];
  whatsappUsers: WhatsappUser[];
  jaring: JaringSource[];
  tasks: FieldTask[];
  forwardedTaskIds: string[];
  incomingItems: IncomingInformation[];
  baketItems: BaketDraft[];
}

interface ApiError extends Error {
  status: number;
}

interface UpdateWhatsappUserInput {
  name?: string;
  username?: string;
  password?: string;
}

declare global {
  // Keep dev mutations stable across hot reloads while this screen is still using local BFF data.
  var densCakraFieldOfficerState: FieldOfficerState | undefined;
}

const now = "2026-07-10T08:15:00.000+07:00";

const fieldOfficerAccountMap: Record<string, string> = {
  "field.officer@denscakra.local": DEFAULT_FIELD_OFFICER_ID,
  "field.officer.bangkinang@denscakra.local": DEFAULT_FIELD_OFFICER_ID,
  "field.officer.pekanbaru@denscakra.local": "fo-pekanbaru-001",
  "field.officer.dumai@denscakra.local": DEFAULT_FIELD_OFFICER_ID,
  "field.officer.bengkalis@denscakra.local": "fo-pekanbaru-001",
  "field.officer.bandung@denscakra.local": "fo-pekanbaru-001",
  "field.officer.pelalawan@denscakra.local": DEFAULT_FIELD_OFFICER_ID,
  "field.officer.siak@denscakra.local": "fo-pekanbaru-001",
};

const fieldOfficerIdAliases: Record<string, string> = {
  "field-officer": DEFAULT_FIELD_OFFICER_ID,
  "field-officer-bangkinang": DEFAULT_FIELD_OFFICER_ID,
  "fo-bangkinang": DEFAULT_FIELD_OFFICER_ID,
  "fo-bangkinang-001": DEFAULT_FIELD_OFFICER_ID,
  "field-officer-pekanbaru": "fo-pekanbaru-001",
  "fo-pekanbaru": "fo-pekanbaru-001",
  "fo-pekanbaru-001": "fo-pekanbaru-001",
  "field-officer-dumai": DEFAULT_FIELD_OFFICER_ID,
  "fo-dumai": DEFAULT_FIELD_OFFICER_ID,
  "fo-dumai-001": DEFAULT_FIELD_OFFICER_ID,
  "field-officer-bengkalis": "fo-pekanbaru-001",
  "fo-bengkalis": "fo-pekanbaru-001",
  "fo-bengkalis-001": "fo-pekanbaru-001",
  "field-officer-bandung": "fo-pekanbaru-001",
  "fo-bandung": "fo-pekanbaru-001",
  "fo-bandung-002": "fo-pekanbaru-001",
  "field-officer-pelalawan": DEFAULT_FIELD_OFFICER_ID,
  "fo-pelalawan": DEFAULT_FIELD_OFFICER_ID,
  "fo-pelalawan-001": DEFAULT_FIELD_OFFICER_ID,
  "field-officer-siak": "fo-pekanbaru-001",
  "fo-siak": "fo-pekanbaru-001",
  "fo-siak-001": "fo-pekanbaru-001",
};

function createError(message: string, status = 400): ApiError {
  const error = new Error(message) as ApiError;
  error.status = status;
  return error;
}

function createInitialState(): FieldOfficerState {
  const fieldOfficers: FieldOfficer[] = [
    {
      id: DEFAULT_FIELD_OFFICER_ID,
      agentUserId: 1,
      name: "Field Officer Bangkinang",
      title: "Collection Owner",
      sector: "Bangkinang Sector",
      commander: "Korwil Riau Selatan",
    },
    {
      id: "fo-pekanbaru-001",
      agentUserId: 2,
      name: "Field Officer Pekanbaru",
      title: "Collection Owner",
      sector: "Pekanbaru Sector",
      commander: "Korwil Riau Selatan",
    },
  ];

  const whatsappUsers: WhatsappUser[] = [
    {
      id: 1,
      whatsappId: "6281200000001",
      name: "Field Officer Bangkinang",
      role: "AGENT",
      authPin: "000001",
      agentUsername: "fo-bangkinang-001",
      agentPasswordPlain: "denscakra",
      isVerified: true,
      createdAt: "2026-07-01T08:00:00.000+07:00",
    },
    {
      id: 2,
      whatsappId: "6281200000002",
      name: "Field Officer Pekanbaru",
      role: "AGENT",
      authPin: "000002",
      agentUsername: "fo-pekanbaru-001",
      agentPasswordPlain: "denscakra",
      isVerified: true,
      createdAt: "2026-07-01T08:00:00.000+07:00",
    },
    {
      id: 101,
      whatsappId: "6281266104300",
      name: "Jaring Jalan Prof M Yamin",
      role: "JARING",
      authPin: "394821",
      agentId: 1,
      isVerified: true,
      createdAt: "2026-07-02T10:12:00.000+07:00",
    },
    {
      id: 102,
      whatsappId: "6281266529169",
      name: "Jaring Jalan Ahmad Yani",
      role: "JARING",
      authPin: "820144",
      agentId: 1,
      isVerified: true,
      createdAt: "2026-07-02T10:17:00.000+07:00",
    },
    {
      id: 103,
      whatsappId: "6281270030390",
      name: "Jaring Jalan DI Panjaitan",
      role: "JARING",
      authPin: "510287",
      agentId: 1,
      isVerified: false,
      createdAt: "2026-07-03T09:40:00.000+07:00",
    },
    {
      id: 104,
      whatsappId: "6281270453053",
      name: "Jaring Jalan Sisingamangaraja",
      role: "JARING",
      authPin: "773902",
      agentId: 1,
      isVerified: true,
      createdAt: "2026-07-03T11:05:00.000+07:00",
    },
    {
      id: 201,
      whatsappId: "6281311102200",
      name: "Jaring Jalan Sudirman",
      role: "JARING",
      authPin: "118822",
      agentId: 2,
      isVerified: true,
      createdAt: "2026-07-04T08:45:00.000+07:00",
    },
  ];

  const jaring: JaringSource[] = [
    {
      id: "jrg-dmi-17a",
      fieldOfficerId: DEFAULT_FIELD_OFFICER_ID,
      whatsappUserId: 101,
      sourceCode: "JRG-17A",
      alias: "Jaring Jalan Prof M Yamin",
      area: "Jalan Prof. M. Yamin",
      reliability: "B",
      registeredAt: "2026-07-02T10:12:00.000+07:00",
      active: true,
    },
    {
      id: "jrg-dmi-09c",
      fieldOfficerId: DEFAULT_FIELD_OFFICER_ID,
      whatsappUserId: 102,
      sourceCode: "JRG-09C",
      alias: "Jaring Jalan Ahmad Yani",
      area: "Jalan Ahmad Yani",
      reliability: "A",
      registeredAt: "2026-07-02T10:17:00.000+07:00",
      active: true,
    },
    {
      id: "jrg-bks-03b",
      fieldOfficerId: DEFAULT_FIELD_OFFICER_ID,
      whatsappUserId: 103,
      sourceCode: "JRG-03B",
      alias: "Jaring Jalan DI Panjaitan",
      area: "Jalan DI Panjaitan",
      reliability: "C",
      registeredAt: "2026-07-03T09:40:00.000+07:00",
      active: true,
    },
    {
      id: "jrg-rpt-11d",
      fieldOfficerId: DEFAULT_FIELD_OFFICER_ID,
      whatsappUserId: 104,
      sourceCode: "JRG-11D",
      alias: "Jaring Jalan Sisingamangaraja",
      area: "Jalan Sisingamangaraja",
      reliability: "B",
      registeredAt: "2026-07-03T11:05:00.000+07:00",
      active: true,
    },
    {
      id: "jrg-bdg-04a",
      fieldOfficerId: "fo-pekanbaru-001",
      whatsappUserId: 201,
      sourceCode: "JRG-04A",
      alias: "Jaring Jalan Sudirman",
      area: "Jalan Jenderal Sudirman",
      reliability: "B",
      registeredAt: "2026-07-04T08:45:00.000+07:00",
      active: true,
    },
  ];

  const tasks: FieldTask[] = [
    {
      id: "FT-042",
      title: "Observasi aktivitas koridor Bangkinang",
      commander: "Korwil Riau Selatan",
      area: "Bangkinang",
      priority: "High",
      due: "Hari ini 18.00",
      status: "In Progress",
      fieldOfficerId: DEFAULT_FIELD_OFFICER_ID,
      sourceDirective: "UUK-RIAU-2026-07",
    },
    {
      id: "FT-039",
      title: "Konfirmasi sumber HUMINT Jalan Ahmad Yani",
      commander: "Korwil Riau Selatan",
      area: "Bangkinang",
      priority: "Medium",
      due: "Besok 10.00",
      status: "Pending",
      fieldOfficerId: DEFAULT_FIELD_OFFICER_ID,
      sourceDirective: "ASSIGN-OIM-014",
    },
    {
      id: "FT-055",
      title: "Pemetaan aktivitas koridor Pekanbaru",
      commander: "Korwil Jawa Barat",
      area: "Pekanbaru",
      priority: "Medium",
      due: "11 Jul 2026 12.00",
      status: "Pending",
      fieldOfficerId: "fo-pekanbaru-001",
      sourceDirective: "ASSIGN-OIM-019",
    },
    {
      id: "FT-059",
      title: "Identifikasi Penyelundupan Logistik Ilegal Siak",
      commander: "Korwil Riau Utara",
      area: "Siak",
      priority: "High",
      due: "Hari ini 20.00",
      status: "Pending",
      fieldOfficerId: "fo-pekanbaru-001",
      sourceDirective: "UUK-RIAU-2026-08",
    },
    {
      id: "FT-061",
      title: "Pemantauan Aktivitas Kelompok Tak Dikenal",
      commander: "Korwil Riau Selatan",
      area: "Kampar",
      priority: "High",
      due: "Besok 12.00",
      status: "Pending",
      fieldOfficerId: "fo-pekanbaru-001",
      sourceDirective: "UUK-RIAU-2026-09",
    },
  ];

  const incomingItems: IncomingInformation[] = [
    {
      id: "INC-1182",
      reportId: 501,
      whatsappId: "6281266104300",
      jaringId: "jrg-dmi-17a",
      fieldOfficerId: DEFAULT_FIELD_OFFICER_ID,
      sourceCode: "JRG-17A",
      receivedAt: "2026-07-10T07:20:00.000+07:00",
      area: "Jalan Prof. M. Yamin",
      summary: "Kendaraan box putih berhenti berulang di akses gudang pelabuhan lama.",
      content: "Terpantau kendaraan box putih berhenti berulang di akses gudang pelabuhan lama.",
      status: "Routed",
      photoUrl: null,
      location: {
        latitude: 1.675921,
        longitude: 101.448112,
        accuracy: 18,
        label: "Akses gudang pelabuhan lama",
      },
    },
    {
      id: "INC-1179",
      reportId: 502,
      whatsappId: "6281266529169",
      jaringId: "jrg-dmi-09c",
      fieldOfficerId: DEFAULT_FIELD_OFFICER_ID,
      sourceCode: "JRG-09C",
      receivedAt: "2026-07-10T06:45:00.000+07:00",
      area: "Jalan Ahmad Yani",
      summary: "Aktivitas bongkar muat kecil berlangsung di sisi dermaga lama menjelang sore.",
      content: "Aktivitas bongkar muat kecil berlangsung di sisi dermaga lama menjelang sore.",
      status: "Valid",
      validatedBy: DEFAULT_FIELD_OFFICER_ID,
      validatedAt: "2026-07-10T07:12:00.000+07:00",
      photoUrl: null,
      location: {
        latitude: 1.682315,
        longitude: 101.452884,
        accuracy: 24,
        label: "Dermaga lama",
      },
    },
    {
      id: "INC-1176",
      reportId: 503,
      whatsappId: "6281270030390",
      jaringId: "jrg-bks-03b",
      fieldOfficerId: DEFAULT_FIELD_OFFICER_ID,
      sourceCode: "JRG-03B",
      receivedAt: "2026-07-09T21:40:00.000+07:00",
      area: "Jalan DI Panjaitan",
      summary: "Pertemuan singkat tiga orang di warung dekat terminal lama.",
      content: "Sumber melihat pertemuan singkat tiga orang di warung dekat terminal lama.",
      status: "Closed",
      closedAt: "2026-07-10T07:10:00.000+07:00",
      closureReason: "Tidak cukup indikasi dan duplikasi laporan lama.",
      photoUrl: null,
      location: {
        latitude: 1.474893,
        longitude: 102.123744,
        accuracy: 31,
        label: "Koridor DI Panjaitan",
      },
    },
    {
      id: "INC-1184",
      reportId: 504,
      whatsappId: "6281270453053",
      jaringId: "jrg-rpt-11d",
      fieldOfficerId: DEFAULT_FIELD_OFFICER_ID,
      sourceCode: "JRG-11D",
      receivedAt: "2026-07-10T08:05:00.000+07:00",
      area: "Jalan Sisingamangaraja",
      summary: "Perpindahan paket kecil dari speedboat ke kendaraan roda dua di area pesisir.",
      content: "Ada perpindahan paket kecil dari speedboat ke kendaraan roda dua di area pesisir.",
      status: "Under Validation",
      photoUrl: null,
      location: {
        latitude: 1.704211,
        longitude: 101.593201,
        accuracy: 27,
        label: "Jalan Sisingamangaraja",
      },
    },
    {
      id: "INC-2201",
      reportId: 601,
      whatsappId: "6281311102200",
      jaringId: "jrg-bdg-04a",
      fieldOfficerId: "fo-pekanbaru-001",
      sourceCode: "JRG-04A",
      receivedAt: "2026-07-10T08:00:00.000+07:00",
      area: "Jalan Jenderal Sudirman",
      summary: "Pergerakan kendaraan tertutup di koridor Sudirman Pekanbaru.",
      content: "Jaring Jalan Sudirman melaporkan pergerakan kendaraan tertutup di koridor Sudirman Pekanbaru.",
      status: "Routed",
      photoUrl: null,
      location: {
        latitude: -6.941381,
        longitude: 107.690912,
        accuracy: 22,
        label: "Koridor Sudirman Pekanbaru",
      },
    },
  ];

  const baketItems: BaketDraft[] = [
    {
      id: "BAK-032",
      sourceRef: "INC-1179",
      incomingInformationId: "INC-1179",
      fieldOfficerId: DEFAULT_FIELD_OFFICER_ID,
      title: "Indikasi aktivitas bongkar muat dermaga lama",
      area: "Jalan Ahmad Yani",
      status: "Draft",
      completeness: "5W+1H 70%",
    },
    {
      id: "BAK-027",
      sourceRef: "INC-1168",
      incomingInformationId: "INC-1168",
      fieldOfficerId: DEFAULT_FIELD_OFFICER_ID,
      title: "Klarifikasi jaringan distribusi lokal",
      area: "Bangkinang",
      status: "Returned",
      completeness: "Revisi sumber dan lokasi",
    },
  ];

  return { fieldOfficers, whatsappUsers, jaring, tasks, forwardedTaskIds: [], incomingItems, baketItems };
}

function state() {
  const currentState = globalThis.densCakraFieldOfficerState ?? createInitialState();
  globalThis.densCakraFieldOfficerState = currentState;
  return currentState;
}

export function normalizeFieldOfficerId(fieldOfficerId?: string | null) {
  const rawCandidate = fieldOfficerId?.trim() || DEFAULT_FIELD_OFFICER_ID;
  const candidate = fieldOfficerIdAliases[rawCandidate.toLowerCase()] || rawCandidate;
  return state().fieldOfficers.some((fieldOfficer) => fieldOfficer.id === candidate)
    ? candidate
    : DEFAULT_FIELD_OFFICER_ID;
}

export function resolveFieldOfficerIdFromEmail(email?: string | null) {
  if (!email) return DEFAULT_FIELD_OFFICER_ID;
  const normalizedEmail = email.toLowerCase();
  const mappedId = fieldOfficerAccountMap[normalizedEmail];
  if (mappedId) return normalizeFieldOfficerId(mappedId);

  const localPart = normalizedEmail.split("@")[0]?.replace(/[._\s]+/g, "-");
  return normalizeFieldOfficerId(localPart);
}

export function getWorkspace(fieldOfficerId = DEFAULT_FIELD_OFFICER_ID): FieldOfficerWorkspace {
  const currentFieldOfficerId = normalizeFieldOfficerId(fieldOfficerId);
  const currentState = state();
  const fieldOfficer = currentState.fieldOfficers.find((item) => item.id === currentFieldOfficerId);

  if (!fieldOfficer) throw createError("Field Officer tidak ditemukan", 404);

  const ownedJaring = currentState.jaring.filter((item) => item.fieldOfficerId === currentFieldOfficerId);
  const ownedJaringIds = new Set(ownedJaring.map((item) => item.id));
  const incomingItems = currentState.incomingItems.filter(
    (item) => item.fieldOfficerId === currentFieldOfficerId && ownedJaringIds.has(item.jaringId),
  );

  return {
    fieldOfficer,
    jaring: ownedJaring,
    tasks: currentState.tasks.filter((item) => item.fieldOfficerId === currentFieldOfficerId),
    forwardedTaskIds: currentState.forwardedTaskIds,
    incomingItems,
    baketItems: currentState.baketItems.filter((item) => item.fieldOfficerId === currentFieldOfficerId),
    locationPins: incomingItems.flatMap(toLocationPin),
  };
}

export function updateFieldTaskStatus(
  fieldOfficerId = DEFAULT_FIELD_OFFICER_ID,
  taskId: string,
  status: FieldTask["status"],
) {
  const task = requireOwnedTask(fieldOfficerId, taskId);
  task.status = status;
  return task;
}

export function forwardFieldTask(fieldOfficerId = DEFAULT_FIELD_OFFICER_ID, taskId: string) {
  const task = requireOwnedTask(fieldOfficerId, taskId);
  const currentState = state();
  if (!currentState.forwardedTaskIds.includes(task.id)) currentState.forwardedTaskIds.push(task.id);
  return { task, forwardedTaskIds: currentState.forwardedTaskIds };
}

export function listWhatsappUsers(fieldOfficerId = DEFAULT_FIELD_OFFICER_ID) {
  const workspace = getWorkspace(fieldOfficerId);
  const ownedWhatsappUserIds = new Set(workspace.jaring.map((item) => item.whatsappUserId));
  ownedWhatsappUserIds.add(workspace.fieldOfficer.agentUserId);

  return state().whatsappUsers.filter((user) => ownedWhatsappUserIds.has(user.id));
}

export function createJaringUser(fieldOfficerId = DEFAULT_FIELD_OFFICER_ID, phoneNumber: string, name?: string) {
  const currentState = state();
  const workspace = getWorkspace(fieldOfficerId);
  const cleanedPhone = phoneNumber.replace(/\D/g, "");

  if (!cleanedPhone) throw createError("Nomor WhatsApp wajib diisi");
  if (currentState.whatsappUsers.some((user) => user.whatsappId === cleanedPhone)) {
    throw createError("Nomor WhatsApp sudah terdaftar", 409);
  }

  const userId = Math.max(...currentState.whatsappUsers.map((user) => user.id)) + 1;
  const jaringNumber = currentState.jaring.filter((item) => item.fieldOfficerId === workspace.fieldOfficer.id).length + 1;
  const user: WhatsappUser = {
    id: userId,
    whatsappId: cleanedPhone,
    name: name || `Jaring ${workspace.fieldOfficer.sector} ${jaringNumber}`,
    role: "JARING",
    authPin: createPin(userId),
    agentId: workspace.fieldOfficer.agentUserId,
    isVerified: false,
    createdAt: new Date().toISOString(),
  };

  currentState.whatsappUsers.unshift(user);
  currentState.jaring.unshift({
    id: `jrg-${userId}`,
    fieldOfficerId: workspace.fieldOfficer.id,
    whatsappUserId: user.id,
    sourceCode: `JRG-${String(userId).slice(-3)}`,
    alias: user.name || `Jaring ${userId}`,
    area: workspace.fieldOfficer.sector,
    reliability: "C",
    registeredAt: user.createdAt || new Date().toISOString(),
    active: true,
  });

  return user;
}

export function updateWhatsappUser(
  fieldOfficerId = DEFAULT_FIELD_OFFICER_ID,
  userId: number,
  input: UpdateWhatsappUserInput,
) {
  const user = requireOwnedWhatsappUser(fieldOfficerId, userId);

  if (user.role === "AGENT") {
    user.agentUsername = input.username || user.agentUsername;
    user.agentPasswordPlain = input.password || user.agentPasswordPlain;
  } else {
    user.name = input.name || user.name;
    const jaring = state().jaring.find((item) => item.whatsappUserId === user.id);
    if (jaring && input.name) jaring.alias = input.name;
  }

  return user;
}

export function regenerateWhatsappPin(fieldOfficerId = DEFAULT_FIELD_OFFICER_ID, userId: number) {
  const user = requireOwnedWhatsappUser(fieldOfficerId, userId);
  if (user.role !== "JARING") throw createError("PIN hanya untuk Jaring", 422);
  user.authPin = createPin(Date.now() + userId);
  return user;
}

export function deleteWhatsappUser(fieldOfficerId = DEFAULT_FIELD_OFFICER_ID, userId: number) {
  const user = requireOwnedWhatsappUser(fieldOfficerId, userId);
  if (user.role === "AGENT") throw createError("Akun Field Officer tidak dapat dihapus dari layar ini", 422);

  const currentState = state();
  currentState.whatsappUsers = currentState.whatsappUsers.filter((item) => item.id !== user.id);
  currentState.jaring = currentState.jaring.filter((item) => item.whatsappUserId !== user.id);
  currentState.incomingItems = currentState.incomingItems.filter((item) => item.whatsappId !== user.whatsappId);
}

export function listWhatsappReports(fieldOfficerId = DEFAULT_FIELD_OFFICER_ID) {
  return getWorkspace(fieldOfficerId).incomingItems.map((item) => ({
    id: item.reportId,
    whatsappId: item.whatsappId,
    pushName: state().jaring.find((jaring) => jaring.id === item.jaringId)?.alias || item.sourceCode,
    content: item.content,
    photoUrl: item.photoUrl,
    locationLatitude: item.location?.latitude ?? null,
    locationLongitude: item.location?.longitude ?? null,
    locationLivePeriod: null,
    status: toWhatsappReportStatus(item.status),
    informationStatus: toWhatsappReportStatus(item.status),
    baketId: state().baketItems.find((baket) => baket.incomingInformationId === item.id)?.id ?? null,
    closedAt: item.closedAt,
    createdAt: item.receivedAt,
  }));
}

export function getWhatsappReportStats(fieldOfficerId = DEFAULT_FIELD_OFFICER_ID) {
  const reports = listWhatsappReports(fieldOfficerId);
  const today = new Date(now).toDateString();

  return {
    totalReports: reports.length,
    totalUsers: listWhatsappUsers(fieldOfficerId).filter((user) => user.role === "JARING").length,
    todayReports: reports.filter((report) => new Date(report.createdAt).toDateString() === today).length,
  };
}

export function deleteWhatsappReport(fieldOfficerId = DEFAULT_FIELD_OFFICER_ID, reportId: number) {
  const incoming = requireOwnedIncoming(fieldOfficerId, String(reportId));
  state().incomingItems = state().incomingItems.filter((item) => item.id !== incoming.id);
}

export function validateIncoming(fieldOfficerId = DEFAULT_FIELD_OFFICER_ID, incomingId: string, decision: "Valid" | "Invalid") {
  const incoming = requireOwnedIncoming(fieldOfficerId, incomingId);

  if (incoming.status === "Converted") throw createError("Incoming Information sudah menjadi BAKET", 409);
  if (incoming.status === "Closed") throw createError("Incoming Information sudah ditutup", 409);

  incoming.validatedBy = normalizeFieldOfficerId(fieldOfficerId);
  incoming.validatedAt = new Date().toISOString();

  if (decision === "Invalid") {
    incoming.status = "Closed";
    incoming.closedAt = incoming.validatedAt;
    incoming.closureReason = "Ditutup oleh Field Officer setelah validasi lapangan.";
    return { incoming };
  }

  incoming.status = "Valid";
  return { incoming, baket: createBaketFromIncoming(fieldOfficerId, incoming.id) };
}

export function createBaketFromIncoming(fieldOfficerId = DEFAULT_FIELD_OFFICER_ID, incomingId: string) {
  const incoming = requireOwnedIncoming(fieldOfficerId, incomingId);

  if (incoming.status !== "Valid") {
    throw createError("Hanya Incoming Information valid yang bisa diubah menjadi BAKET", 422);
  }

  const existing = state().baketItems.find((item) => item.incomingInformationId === incoming.id);
  if (existing) return existing;

  const baket: BaketDraft = {
    id: `BAK-${incoming.reportId}`,
    sourceRef: incoming.id,
    incomingInformationId: incoming.id,
    fieldOfficerId: normalizeFieldOfficerId(fieldOfficerId),
    title: `BAKET dari ${incoming.sourceCode}`,
    area: incoming.area,
    status: "Draft",
    completeness: "5W+1H perlu dilengkapi",
  };

  state().baketItems.unshift(baket);
  incoming.status = "Converted";
  return baket;
}

export function updateBaketSummary(fieldOfficerId = DEFAULT_FIELD_OFFICER_ID, baketId: string, summaryHtml: string) {
  const baket = requireOwnedBaket(fieldOfficerId, baketId);
  baket.summaryHtml = summaryHtml;
  baket.summaryUpdatedAt = new Date().toISOString();
  baket.completeness = "Summary siap dikirim";
  return baket;
}

export function submitBaket(fieldOfficerId = DEFAULT_FIELD_OFFICER_ID, baketId: string) {
  const baket = requireOwnedBaket(fieldOfficerId, baketId);
  if (!baket.summaryHtml) throw createError("Summary BAKET wajib diisi sebelum submit", 422);

  baket.status = "Submitted";
  baket.submittedAt = new Date().toISOString();
  return baket;
}

export function handleRepositoryError(error: unknown) {
  if (error instanceof Error && "status" in error) {
    return { message: error.message, status: (error as ApiError).status };
  }

  return { message: error instanceof Error ? error.message : "Terjadi kesalahan backend", status: 500 };
}

function requireOwnedWhatsappUser(fieldOfficerId: string, userId: number) {
  const users = listWhatsappUsers(fieldOfficerId);
  const user = users.find((item) => item.id === userId);
  if (!user) throw createError("User tidak berada dalam kewenangan Field Officer ini", 403);
  return user;
}

function requireOwnedIncoming(fieldOfficerId: string, incomingIdOrReportId: string) {
  const workspace = getWorkspace(fieldOfficerId);
  const incoming = workspace.incomingItems.find(
    (item) => item.id === incomingIdOrReportId || String(item.reportId) === incomingIdOrReportId,
  );

  if (!incoming) throw createError("Incoming Information tidak berada dalam kewenangan Field Officer ini", 403);
  return incoming;
}

function requireOwnedTask(fieldOfficerId: string, taskId: string) {
  const currentFieldOfficerId = normalizeFieldOfficerId(fieldOfficerId);
  const task = state().tasks.find((item) => item.id === taskId && item.fieldOfficerId === currentFieldOfficerId);
  if (!task) throw createError("Tugas tidak berada dalam kewenangan Field Officer ini", 403);
  return task;
}

function requireOwnedBaket(fieldOfficerId: string, baketId: string) {
  const baket = getWorkspace(fieldOfficerId).baketItems.find((item) => item.id === baketId);
  if (!baket) throw createError("BAKET tidak berada dalam kewenangan Field Officer ini", 403);
  return baket;
}

function toLocationPin(item: IncomingInformation): LocationPin[] {
  if (!item.location) return [];

  return [
    {
      id: item.reportId,
      incomingInformationId: item.id,
      jaringId: item.jaringId,
      sourceCode: item.sourceCode,
      submitter: state().jaring.find((jaring) => jaring.id === item.jaringId)?.alias || item.sourceCode,
      area: item.area,
      content: item.content,
      latitude: item.location.latitude,
      longitude: item.location.longitude,
      accuracy: item.location.accuracy,
      status: item.status,
      createdAt: item.receivedAt,
    },
  ];
}

function toWhatsappReportStatus(status: IncomingStatus) {
  if (status === "Closed" || status === "Invalid") return "closed";
  if (status === "Converted" || status === "Valid") return "baket";
  return "pending";
}

function createPin(seed: number) {
  return String(Math.abs(seed * 7919) % 1_000_000).padStart(6, "0");
}
