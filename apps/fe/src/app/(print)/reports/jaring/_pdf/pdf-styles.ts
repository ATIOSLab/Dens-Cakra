import { StyleSheet } from "@react-pdf/renderer";

export const PDF_COLORS = {
  primary: "#174D6B",
  cyan: "#2AA8C3",
  green: "#3A9D69",
  blue: "#1485B0",
  orange: "#F28C28",
  danger: "#C85A57",
  border: "#C9D9E1",
  cardBg: "#EAF5FA",
  white: "#FFFFFF",
  zebra: "#EDF4F7",
  textPrimary: "#243B4D",
  textMuted: "#67839A",
  trackBg: "#E4F0F5",
};

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

export function formatDecimal(value: number, digits = 2): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatPercent(value: number, digits = 1): string {
  return `${formatDecimal(value, digits)}%`;
}

export const styles = StyleSheet.create({
  page: {
    width: "100%",
    height: "100%",
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 32,
    backgroundColor: PDF_COLORS.white,
    fontFamily: "Helvetica",
    color: PDF_COLORS.textPrimary,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLORS.border,
    paddingBottom: 6,
    marginBottom: 10,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  headerBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 2,
    backgroundColor: PDF_COLORS.primary,
  },
  headerTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: PDF_COLORS.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  headerPeriod: {
    fontSize: 7.5,
    color: PDF_COLORS.textMuted,
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.border,
    paddingTop: 6,
    marginTop: 10,
    fontSize: 7.5,
    color: PDF_COLORS.textMuted,
  },
  footerPageText: {
    fontWeight: "bold",
    color: PDF_COLORS.primary,
  },
  pageTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: PDF_COLORS.primary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  pageSubtitle: {
    fontSize: 8.5,
    color: PDF_COLORS.textMuted,
    marginTop: 2,
    marginBottom: 10,
  },
  // KPI Grid
  kpiRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: PDF_COLORS.cardBg,
    borderColor: PDF_COLORS.border,
    borderWidth: 1,
    borderRadius: 5,
    padding: 7,
    position: "relative",
  },
  kpiTopBar: {
    height: 3,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    marginBottom: 4,
  },
  kpiTitle: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: PDF_COLORS.textMuted,
    textTransform: "uppercase",
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 2,
  },
  kpiSubtitle: {
    fontSize: 7,
    color: PDF_COLORS.textMuted,
    marginTop: 2,
  },
  // Generic Tables
  table: {
    borderWidth: 1,
    borderColor: PDF_COLORS.border,
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 6,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: PDF_COLORS.primary,
    paddingVertical: 5,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  tableHeaderText: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: PDF_COLORS.white,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.border,
    alignItems: "center",
  },
  tableRowZebra: {
    backgroundColor: PDF_COLORS.zebra,
  },
  tableCell: {
    fontSize: 7.5,
    color: PDF_COLORS.textPrimary,
  },
  tableFooterRow: {
    flexDirection: "row",
    backgroundColor: PDF_COLORS.cardBg,
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderTopWidth: 2,
    borderTopColor: PDF_COLORS.primary,
    alignItems: "center",
  },
  tableFooterText: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: PDF_COLORS.primary,
  },
  // Progress Bar
  barTrack: {
    height: 5,
    width: "100%",
    backgroundColor: PDF_COLORS.trackBg,
    borderRadius: 2.5,
    overflow: "hidden",
    marginTop: 2,
  },
  barFill: {
    height: "100%",
    borderRadius: 2.5,
  },
  // Box / Panels
  panel: {
    backgroundColor: PDF_COLORS.cardBg,
    borderColor: PDF_COLORS.border,
    borderWidth: 1,
    borderRadius: 5,
    padding: 8,
    marginBottom: 8,
  },
  panelWhite: {
    backgroundColor: PDF_COLORS.white,
    borderColor: PDF_COLORS.border,
    borderWidth: 1,
    borderRadius: 5,
    padding: 8,
    marginBottom: 8,
  },
  panelHeader: {
    fontSize: 8.5,
    fontWeight: "bold",
    color: PDF_COLORS.primary,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  bodyText: {
    fontSize: 8,
    color: PDF_COLORS.textPrimary,
    lineHeight: 1.3,
  },
});
