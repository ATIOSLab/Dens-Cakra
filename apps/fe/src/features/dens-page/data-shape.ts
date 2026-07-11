import type { ApiMeta } from "@/lib/api/types";

export type EndpointResult = {
  label: string;
  path: string;
  ok: boolean;
  data: unknown;
  meta?: ApiMeta;
  error?: {
    status?: number;
    code: string;
    message: string;
  };
};

export function getItems(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.items)) {
      return record.items;
    }
    if (Array.isArray(record.data)) {
      return record.data;
    }
    if (Array.isArray(record.features)) {
      return record.features;
    }
  }

  return [];
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `${value.length} item`;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return String(record.name ?? record.title ?? record.code ?? record.id ?? "Object");
  }

  return String(value);
}

export function pickDisplayFields(item: unknown) {
  if (!item || typeof item !== "object") {
    return [];
  }

  const record = item as Record<string, unknown>;
  const preferred = [
    "title",
    "name",
    "fullName",
    "code",
    "status",
    "severity",
    "priority",
    "roleCode",
    "areaName",
    "createdAt",
    "updatedAt",
  ];
  const keys = preferred.filter((key) => key in record);

  if (keys.length > 0) {
    return keys.slice(0, 6).map((key) => [key, record[key]] as const);
  }

  return Object.entries(record).slice(0, 6);
}

export function countRecords(result: EndpointResult) {
  if (!result.ok) {
    return 0;
  }

  const items = getItems(result.data);
  if (items.length > 0) {
    return items.length;
  }

  return result.data && typeof result.data === "object" ? 1 : 0;
}
