import {
  JaringRegistrationStatus,
  JaringStatus,
} from '../../generated/prisma/client.js';
import {
  classifyJaringStatus,
  compareMetric,
  formatIndonesianNumber,
  formatIndonesianPercent,
  JARING_STATUS_GROUP,
  maskPhone,
  percentage,
} from './kpi-metrics.js';

describe('KPI pemetaan status Jaring', () => {
  it('memetakan APPROVED + ACTIVE menjadi Jaring Aktif Terverifikasi', () => {
    expect(
      classifyJaringStatus(
        JaringStatus.ACTIVE,
        JaringRegistrationStatus.APPROVED,
      ),
    ).toBe(JARING_STATUS_GROUP.ACTIVE_VERIFIED);
  });

  it('memetakan APPROVED + INACTIVE menjadi Terverifikasi tetapi Nonaktif', () => {
    expect(
      classifyJaringStatus(
        JaringStatus.INACTIVE,
        JaringRegistrationStatus.APPROVED,
      ),
    ).toBe(JARING_STATUS_GROUP.VERIFIED_INACTIVE);
  });

  it('memetakan APPROVED + TRANSFERRED/ARCHIVED menjadi Terverifikasi tetapi Nonaktif', () => {
    expect(
      classifyJaringStatus(
        JaringStatus.TRANSFERRED,
        JaringRegistrationStatus.APPROVED,
      ),
    ).toBe(JARING_STATUS_GROUP.VERIFIED_INACTIVE);
    expect(
      classifyJaringStatus(
        JaringStatus.ARCHIVED,
        JaringRegistrationStatus.APPROVED,
      ),
    ).toBe(JARING_STATUS_GROUP.VERIFIED_INACTIVE);
  });

  it('memetakan PENDING menjadi Menunggu Persetujuan', () => {
    expect(
      classifyJaringStatus(
        JaringStatus.INACTIVE,
        JaringRegistrationStatus.PENDING,
      ),
    ).toBe(JARING_STATUS_GROUP.PENDING_APPROVAL);
  });

  it('memetakan REJECTED menjadi Ditolak', () => {
    expect(
      classifyJaringStatus(
        JaringStatus.INACTIVE,
        JaringRegistrationStatus.REJECTED,
      ),
    ).toBe(JARING_STATUS_GROUP.REJECTED);
  });

  it('memetakan PENDING dan REJECTED berdasarkan status registrasi (apa pun status aktif)', () => {
    expect(
      classifyJaringStatus(
        JaringStatus.ACTIVE,
        JaringRegistrationStatus.PENDING,
      ),
    ).toBe(JARING_STATUS_GROUP.PENDING_APPROVAL);
    expect(
      classifyJaringStatus(
        JaringStatus.ACTIVE,
        JaringRegistrationStatus.REJECTED,
      ),
    ).toBe(JARING_STATUS_GROUP.REJECTED);
  });
});

describe('KPI perhitungan dasar', () => {
  it('persentase memakai pembagi nol dengan aman', () => {
    expect(percentage(0, 0)).toBe(0);
    expect(percentage(5, 0)).toBe(0);
    expect(percentage(3, 10)).toBe(30);
  });

  it('membandingkan metrik dengan delta dan arah', () => {
    expect(compareMetric(10, 5)).toEqual({
      previous: 5,
      delta: 5,
      percent: 100,
      direction: 'up',
    });
    expect(compareMetric(5, 10).direction).toBe('down');
    expect(compareMetric(5, 5).direction).toBe('flat');
    expect(compareMetric(3, 0).percent).toBeNull();
  });

  it('memformat angka gaya Indonesia', () => {
    expect(formatIndonesianNumber(1465)).toBe('1.465');
    expect(formatIndonesianPercent(10.51)).toBe('10,51%');
  });

  it('menyamarkan nomor telepon tanpa menampilkan nomor lengkap', () => {
    const masked = maskPhone('6281212341234');
    expect(masked).toBe('+62 812-****-1234');
    expect(masked).not.toContain('12341234');
    expect(maskPhone(null)).toBe('-');
  });
});
