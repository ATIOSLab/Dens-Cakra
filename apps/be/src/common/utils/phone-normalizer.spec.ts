import {
  getIndonesianPhoneSearchVariants,
  normalizeIndonesianPhoneNumber,
} from './phone-normalizer.js';

describe('phone normalizer', () => {
  it.each([
    ['081234567890', '6281234567890'],
    ['+62 812-3456-7890', '6281234567890'],
    ['81234567890', '6281234567890'],
  ])('menormalisasi %s menjadi %s', (input, expected) => {
    expect(normalizeIndonesianPhoneNumber(input)).toBe(expected);
  });

  it('membentuk varian pencarian internasional dan lokal', () => {
    expect(getIndonesianPhoneSearchVariants('+62 812-3456')).toEqual([
      '628123456',
      '08123456',
    ]);
  });

  it('tidak menganggap pencarian nama sebagai nomor telepon', () => {
    expect(getIndonesianPhoneSearchVariants('Budi 0812')).toEqual([]);
  });
});
