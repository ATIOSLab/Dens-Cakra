import { Classification } from '../../generated/prisma/client.js';

const CLASSIFICATION_CODES: Record<Exclude<Classification, 'BIASA'>, string> = {
  SANGAT_RAHASIA: 'SR',
  RAHASIA: 'R',
  TERBATAS: 'T',
};

const ROMAN_MONTHS = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
  'XI',
  'XII',
] as const;

export function formatProductNumber(input: {
  classification: Exclude<Classification, 'BIASA'>;
  productCode: string;
  sequence: number;
  date: Date;
}) {
  return `${CLASSIFICATION_CODES[input.classification]}/${input.productCode}-${String(input.sequence).padStart(4, '0')}/${ROMAN_MONTHS[input.date.getUTCMonth()]}/${input.date.getUTCFullYear()}`;
}
