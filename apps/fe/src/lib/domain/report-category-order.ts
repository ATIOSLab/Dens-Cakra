export const REPORT_CATEGORY_DISPLAY_ORDER = [
  "Ideologi",
  "Politik",
  "Ekonomi",
  "Sosial",
  "Budaya",
  "Pertahanan",
  "Keamanan",
] as const;

type ReportCategoryOrderItem = {
  code?: string | null;
  name?: string | null;
};

const UNKNOWN_CATEGORY_RANK = Number.MAX_SAFE_INTEGER;

const REPORT_CATEGORY_ORDER_BY_TOKEN = new Map<string, number>([
  ["IDEOLOGI", 0],
  ["IDEO", 0],
  ["POLITIK", 1],
  ["POL", 1],
  ["EKONOMI", 2],
  ["EKO", 2],
  ["SOSIAL", 3],
  ["SOS", 3],
  ["SOSIAL_BUDAYA", 3],
  ["SOSBUD", 3],
  ["BUDAYA", 4],
  ["BUD", 4],
  ["PERTAHANAN", 5],
  ["HAN", 5],
  ["PERTAHANAN_KEAMANAN", 5],
  ["HANKAM", 5],
  ["KEAMANAN", 6],
  ["KAM", 6],
]);

function normalizeCategoryToken(value?: string | null) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function reportCategoryRank(category: ReportCategoryOrderItem) {
  const candidates = [category.code, category.name].map(normalizeCategoryToken).filter(Boolean);

  for (const candidate of candidates) {
    const rank = REPORT_CATEGORY_ORDER_BY_TOKEN.get(candidate);
    if (rank !== undefined) return rank;
  }

  return UNKNOWN_CATEGORY_RANK;
}

export function compareReportCategories<T extends ReportCategoryOrderItem>(left: T, right: T) {
  const rankDiff = reportCategoryRank(left) - reportCategoryRank(right);
  if (rankDiff !== 0) return rankDiff;

  const leftName = left.name ?? left.code ?? "";
  const rightName = right.name ?? right.code ?? "";
  const nameDiff = leftName.localeCompare(rightName, "id", { sensitivity: "base" });
  if (nameDiff !== 0) return nameDiff;

  return (left.code ?? "").localeCompare(right.code ?? "", "id", { sensitivity: "base" });
}

export function sortReportCategories<T extends ReportCategoryOrderItem>(categories: readonly T[] | null | undefined) {
  return [...(categories ?? [])].sort(compareReportCategories);
}
