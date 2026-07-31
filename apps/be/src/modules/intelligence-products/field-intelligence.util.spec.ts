import {
  classifyJaringActivity,
  FieldIntelligencePeriod,
  JaringActivityLevel,
  resolveFieldIntelligencePeriod,
} from './field-intelligence.util.js';

describe('field intelligence dashboard utilities', () => {
  it.each([
    [4, 4, JaringActivityLevel.VERY_ACTIVE],
    [1, 8, JaringActivityLevel.ACTIVE],
    [0, 3, JaringActivityLevel.DORMANT],
    [0, 0, JaringActivityLevel.NEVER_REPORTED],
  ])(
    'classifies %s period reports and %s lifetime reports as %s',
    (periodCount, lifetimeCount, expected) => {
      expect(classifyJaringActivity(periodCount, lifetimeCount)).toBe(expected);
    },
  );

  it('resolves the default 30 day operational window', () => {
    const now = new Date('2026-07-31T12:00:00.000Z');
    const result = resolveFieldIntelligencePeriod(
      FieldIntelligencePeriod.DAYS_30,
      undefined,
      undefined,
      now,
    );

    expect(result.from?.toISOString()).toBe('2026-07-01T12:00:00.000Z');
    expect(result.to.toISOString()).toBe(now.toISOString());
  });

  it('keeps the start date open for an all-time view', () => {
    const result = resolveFieldIntelligencePeriod(
      FieldIntelligencePeriod.ALL,
      undefined,
      undefined,
      new Date('2026-07-31T12:00:00.000Z'),
    );

    expect(result.from).toBeUndefined();
  });
});
