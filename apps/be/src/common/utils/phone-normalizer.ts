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
