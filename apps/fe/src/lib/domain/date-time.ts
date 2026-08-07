export const JAKARTA_TIME_ZONE = "Asia/Jakarta";

export type PeriodPreset = "ALL" | "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "THIS_MONTH" | "CUSTOM";

export function jakartaDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function jakartaBoundaryIso(date: string, endOfDay = false) {
  return new Date(`${date}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+07:00`).toISOString();
}

export function resolveJakartaPeriodRange(preset: PeriodPreset, startDate = "", endDate = "", now = new Date()) {
  if (preset === "CUSTOM") return { from: startDate, to: endDate };
  if (preset === "ALL") return { from: "", to: "" };
  if (preset === "THIS_MONTH") {
    const today = jakartaDateKey(now);
    return { from: `${today.slice(0, 7)}-01`, to: today };
  }

  let daysBack = 29;
  if (preset === "TODAY") daysBack = 0;
  if (preset === "LAST_7_DAYS") daysBack = 6;
  return {
    from: jakartaDateKey(new Date(now.getTime() - daysBack * 86_400_000)),
    to: jakartaDateKey(now),
  };
}
