const classificationBadgeBase = "border font-mono text-[10px] font-bold uppercase tracking-wider";

const classificationBadgeClasses: Record<string, string> = {
  BIASA: "border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  TERBATAS: "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  RAHASIA: "border-yellow-500/40 bg-yellow-400/15 text-yellow-700 dark:text-yellow-300",
  SANGAT_RAHASIA: "border-red-500/35 bg-red-500/10 text-red-700 dark:text-red-300",
};

export function normalizeClassification(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replaceAll(" ", "_").replaceAll("-", "_").toUpperCase();
}

export function isClassification(value: unknown) {
  return normalizeClassification(value) in classificationBadgeClasses;
}

export function classificationBadgeClass(value: unknown) {
  const normalized = normalizeClassification(value);

  return [
    classificationBadgeBase,
    classificationBadgeClasses[normalized] ??
      "border-[var(--dc-border-subtle)] bg-[var(--dc-surface-raised)] text-[var(--dc-text-secondary)]",
  ].join(" ");
}
