export function normalizeIndonesianPhoneNumber(input: string): string {
  const digits = input.replace(/\D+/g, '');

  if (!digits) {
    throw new Error('Phone number must contain at least one digit.');
  }

  if (digits.startsWith('62')) {
    return digits;
  }

  if (digits.startsWith('0')) {
    return `62${digits.slice(1)}`;
  }

  if (digits.startsWith('8')) {
    return `62${digits}`;
  }

  return digits;
}

export function formatIndonesianPhoneNumber(value?: string | null): string {
  const raw = (value ?? '').trim();
  if (!raw) return '-';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return raw;
  const national = digits.startsWith('62')
    ? digits.slice(2)
    : digits.startsWith('0')
      ? digits.slice(1)
      : digits;
  if (national.length >= 10) {
    return `+62 ${national.slice(0, 3)}-${national.slice(3, 7)}-${national.slice(7)}`;
  }
  return `+62 ${national}`;
}

export function getIndonesianPhoneSearchVariants(input: string): string[] {
  const value = input.trim();

  if (!value || !/^[+\d\s().-]+$/.test(value)) {
    return [];
  }

  const digits = value.replace(/\D+/g, '');
  if (!digits) {
    return [];
  }

  const normalized = normalizeIndonesianPhoneNumber(digits);
  const local = normalized.startsWith('62')
    ? `0${normalized.slice(2)}`
    : normalized;

  return [...new Set([digits, normalized, local])];
}
