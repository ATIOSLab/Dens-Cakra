function normalizePhoneDigits(value: string): string {
  const digits = value.replace(/\D+/g, "");

  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;

  return digits;
}

export function matchesPhoneSearch(phone: unknown, query: string): boolean {
  const value = query.trim();
  if (!value || !/^[+\d\s().-]+$/.test(value)) return false;

  const phoneDigits = typeof phone === "string" ? phone.replace(/\D+/g, "") : "";
  const queryDigits = value.replace(/\D+/g, "");
  if (!phoneDigits || !queryDigits) return false;

  return (
    phoneDigits.includes(queryDigits) || normalizePhoneDigits(phoneDigits).includes(normalizePhoneDigits(queryDigits))
  );
}
