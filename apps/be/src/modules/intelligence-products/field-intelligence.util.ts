export enum FieldIntelligencePeriod {
  DAYS_7 = '7d',
  DAYS_30 = '30d',
  DAYS_90 = '90d',
  ALL = 'all',
}

export enum JaringActivityLevel {
  VERY_ACTIVE = 'VERY_ACTIVE',
  ACTIVE = 'ACTIVE',
  DORMANT = 'DORMANT',
  NEVER_REPORTED = 'NEVER_REPORTED',
}

export function resolveFieldIntelligencePeriod(
  period: FieldIntelligencePeriod,
  from: string | undefined,
  to: string | undefined,
  now = new Date(),
) {
  const end = to ? new Date(to) : now;
  if (period === FieldIntelligencePeriod.ALL && !from) {
    return { from: undefined, to: end };
  }

  if (from) {
    return { from: new Date(from), to: end };
  }

  const days =
    period === FieldIntelligencePeriod.DAYS_7
      ? 7
      : period === FieldIntelligencePeriod.DAYS_90
        ? 90
        : 30;
  return {
    from: new Date(end.getTime() - days * 24 * 60 * 60 * 1000),
    to: end,
  };
}

export function classifyJaringActivity(
  periodReportCount: number,
  lifetimeReportCount: number,
): JaringActivityLevel {
  if (periodReportCount >= 4) {
    return JaringActivityLevel.VERY_ACTIVE;
  }
  if (periodReportCount > 0) {
    return JaringActivityLevel.ACTIVE;
  }
  if (lifetimeReportCount > 0) {
    return JaringActivityLevel.DORMANT;
  }
  return JaringActivityLevel.NEVER_REPORTED;
}
