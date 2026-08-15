export const PositionCode = {
  ADMIN: 'ADMIN',
  DEPUTI_II: 'DEPUTI_II',
  DIREKTUR_WILAYAH: 'DIREKTUR_WILAYAH',
  KABINDA: 'KABINDA',
  KASUBDIT: 'KASUBDIT',
  KABAGOPS: 'KABAGOPS',
  STAF_SUBDIT: 'STAF_SUBDIT',
  KORWIL: 'KORWIL',
  PETUGAS_ORGANIK: 'PETUGAS_ORGANIK',
} as const;

export type PositionCode = (typeof PositionCode)[keyof typeof PositionCode];
