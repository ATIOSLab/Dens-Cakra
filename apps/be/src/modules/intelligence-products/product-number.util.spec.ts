import { formatProductNumber } from './product-number.util.js';

describe('formatProductNumber', () => {
  it.each([
    ['RAHASIA', 'R/LI-0001/VII/2026'],
    ['SANGAT_RAHASIA', 'SR/LI-0001/VII/2026'],
    ['TERBATAS', 'T/LI-0001/VII/2026'],
  ] as const)(
    'formats %s using the official yearly sequence pattern',
    (classification, expected) => {
      expect(
        formatProductNumber({
          classification,
          productCode: 'LI',
          sequence: 1,
          date: new Date('2026-07-13T00:00:00.000Z'),
        }),
      ).toBe(expected);
    },
  );

  it('pads but never truncates an allocated sequence', () => {
    expect(
      formatProductNumber({
        classification: 'TERBATAS',
        productCode: 'PIS',
        sequence: 10001,
        date: new Date('2026-12-01T00:00:00.000Z'),
      }),
    ).toBe('T/PIS-10001/XII/2026');
  });
});
