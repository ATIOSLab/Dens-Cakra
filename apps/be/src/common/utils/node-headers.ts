import type { IncomingHttpHeaders } from 'node:http';

export function toWebHeaders(headers: IncomingHttpHeaders): Headers {
  const normalized = new Headers();

  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      normalized.set(key, value.join(', '));
      continue;
    }

    normalized.set(key, value);
  }

  return normalized;
}
