import { StyleSheet } from "@react-pdf/renderer";

export const PAGE_WIDTH = 841.89;
export const PAGE_HEIGHT = 595.28;
export const PAGE_MARGIN = 36;
export const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2; // 769.89 pt

export const reportStyles = StyleSheet.create({
  page: {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    paddingTop: 36,
    paddingBottom: 40,
    paddingLeft: PAGE_MARGIN,
    paddingRight: PAGE_MARGIN,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    position: "relative",
  },
  coverPage: {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    padding: 24,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    position: "relative",
  },
  coverOuterBorder: {
    width: PAGE_WIDTH - 48,
    height: PAGE_HEIGHT - 48,
    borderWidth: 1.5,
    borderColor: "#0ea5e9",
    position: "relative",
    padding: 4,
  },
  coverInnerBorder: {
    width: "100%",
    height: "100%",
    borderWidth: 0.5,
    borderColor: "#cbd5e1",
    alignItems: "center",
    paddingTop: 44,
  },
  coverAgency: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  coverDeputy: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#334155",
    marginTop: 6,
    letterSpacing: 0.3,
    textAlign: "center",
  },
  coverSystem: {
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: "#64748b",
    marginTop: 5,
    textAlign: "center",
  },
  coverDivider: {
    width: PAGE_WIDTH - 160,
    height: 1.5,
    backgroundColor: "#0ea5e9",
    marginTop: 18,
    marginBottom: 44,
  },
  coverTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    textAlign: "center",
    lineHeight: 1.25,
  },
  coverSubtitle: {
    fontSize: 13,
    fontFamily: "Helvetica",
    color: "#0ea5e9",
    marginTop: 10,
    textAlign: "center",
  },
  coverAreaBadge: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#334155",
    marginTop: 54,
    textAlign: "center",
  },
  coverStatusDesc: {
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: "#64748b",
    marginTop: 8,
    textAlign: "center",
  },
  coverTotalDesc: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: "#0ea5e9",
    marginTop: 8,
    textAlign: "center",
  },

  // Page Header & Footer
  headerContainer: {
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  headerSubtitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica",
    color: "#0284c7",
    marginTop: 3,
  },
  pageNumber: {
    position: "absolute",
    bottom: 16,
    left: 36,
    right: 36,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#475569",
    textAlign: "center",
  },

  // Infographic Top Cards
  cardsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  card: {
    width: 246,
    height: 44,
    padding: 7,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: "center",
  },
  cardBlue: {
    backgroundColor: "#f0f9ff",
    borderColor: "#bae6fd",
  },
  cardGreen: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  cardYellow: {
    backgroundColor: "#fefce8",
    borderColor: "#fef08a",
  },
  cardLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
  },
  cardValueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: 2,
  },
  cardValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },
  cardSubtext: {
    fontSize: 7,
    fontFamily: "Helvetica",
  },

  // Tables
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    height: 22,
    alignItems: "center",
  },
  tableHeaderText: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    alignItems: "center",
    minHeight: 19,
  },
  tableRowZebra: {
    backgroundColor: "#f8fafc",
  },
  tableCellText: {
    fontSize: 8,
    fontFamily: "Helvetica",
    color: "#1e293b",
  },

  // Profiling Dossier Card
  profilingCard: {
    width: CONTENT_WIDTH,
    height: 224,
    borderWidth: 0.5,
    borderColor: "#94a3b8",
    flexDirection: "row",
    marginBottom: 8,
  },
  profilingCardZebra: {
    backgroundColor: "#f8fafc",
  },
  profilingColNo: {
    width: 40,
    borderRightWidth: 0.5,
    borderRightColor: "#cbd5e1",
    alignItems: "center",
    paddingTop: 14,
  },
  profilingColIdentity: {
    width: 150,
    borderRightWidth: 0.5,
    borderRightColor: "#cbd5e1",
    padding: 10,
    paddingTop: 14,
  },
  profilingColDetails: {
    width: 430,
    borderRightWidth: 0.5,
    borderRightColor: "#cbd5e1",
    padding: 10,
    paddingTop: 12,
  },
  profilingColPhoto: {
    width: 149,
    alignItems: "center",
    justifyContent: "center",
  },
  photoBox: {
    width: 110,
    height: 110,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoImage: {
    width: 110,
    height: 110,
    objectFit: "cover",
  },
});
