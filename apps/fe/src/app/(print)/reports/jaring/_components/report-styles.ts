export const REPORT_COLORS = {
  dark: "#174D6B",
  body: "#243B4D",
  muted: "#67839A",
  cyan: "#2AA8C3",
  blue: "#1485B0",
  green: "#3A9D69",
  red: "#C85A57",
  orange: "#F28C28",
  row: "#EDF4F7",
  box: "#EAF5FA",
  track: "#E4F0F5",
  border: "#C9D9E1",
  white: "#FFFFFF",
} as const;

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "0";
  return new Intl.NumberFormat("id-ID").format(value);
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "0%";
  return `${new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)}%`;
}

export function formatDecimal(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "0";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
