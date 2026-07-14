export type PersonnelStatus = "ACTIVE" | "SUPERVISOR" | "DUTY" | "EMERGENCY" | "OFFLINE";

export const STATUS_COLORS: Record<PersonnelStatus, string> = {
  ACTIVE: "#10b981", // Hijau
  SUPERVISOR: "#3b82f6", // Biru
  DUTY: "#f97316", // Orange
  EMERGENCY: "#ef4444", // Merah
  OFFLINE: "#6b7280", // Abu
};

export const STATUS_LABELS: Record<PersonnelStatus, string> = {
  ACTIVE: "Aktif",
  SUPERVISOR: "Pengawas",
  DUTY: "Sedang Bertugas",
  EMERGENCY: "Darurat",
  OFFLINE: "Tidak Aktif",
};

/**
 * Derives the operational status of a personnel feature.
 */
export function getPersonnelStatus(properties: any, emergencies: any[] = []): PersonnelStatus {
  // 1. Offline checks
  if (!properties.hasLiveLocation || !properties.capturedAt) {
    return "OFFLINE";
  }
  const age = Date.now() - new Date(properties.capturedAt).getTime();
  const LIVE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
  if (age > LIVE_THRESHOLD_MS) {
    return "OFFLINE";
  }

  // 2. Emergency checks
  const isEmergency =
    properties.status === "EMERGENCY" ||
    properties.isEmergency ||
    emergencies.some(
      (e: any) =>
        e.properties?.assignmentId === properties.assignmentId ||
        e.properties?.userId === properties.userProfileId ||
        e.properties?.userName === properties.userName,
    );
  if (isEmergency) {
    return "EMERGENCY";
  }

  // 3. Supervisor checks
  const title = (properties.positionTitle || "").toLowerCase();
  const isSupervisor =
    title.includes("supervisor") ||
    title.includes("koordinator") ||
    title.includes("kordinator") ||
    title.includes("commander") ||
    title.includes("lead") ||
    title.includes("pimpinan") ||
    properties.isSupervisor;
  if (isSupervisor) {
    return "SUPERVISOR";
  }

  // 4. On Duty checks
  const isDuty =
    properties.isOnDuty ||
    properties.isDuty ||
    title.includes("petugas") ||
    title.includes("lapangan") ||
    properties.assignmentId;
  if (isDuty) {
    return "DUTY";
  }

  return "ACTIVE";
}

/**
 * Safe parser for coordinates
 */
export function getCoordinates(feature: any): [number, number] | null {
  const value = feature?.geometry?.coordinates;
  if (!Array.isArray(value) || value.length < 2) return null;
  const longitude = Number(value[0]);
  const latitude = Number(value[1]);
  return Number.isFinite(longitude) && Number.isFinite(latitude) ? [longitude, latitude] : null;
}
