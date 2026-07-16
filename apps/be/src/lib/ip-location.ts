type IpLocationResult = {
  label: string;
  city: string | null;
  region: string | null;
  country: string | null;
  countryCode: string | null;
};

const locationCache = new Map<string, IpLocationResult>();

const EXPANDED_IPV6_UNSPECIFIED = '0000:0000:0000:0000:0000:0000:0000:0000';
const EXPANDED_IPV6_LOOPBACK = '0000:0000:0000:0000:0000:0000:0000:0001';

export function normalizeIpAddress(ip: string | null | undefined) {
  if (!ip?.trim()) {
    return null;
  }

  let normalized = ip.split(',')[0]?.trim().replace(/^"|"$/g, '') ?? '';

  if (normalized.startsWith('[') && normalized.includes(']')) {
    normalized = normalized.slice(1, normalized.indexOf(']'));
  }

  const ipv4MappedMatch = normalized.match(
    /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i,
  );
  if (ipv4MappedMatch?.[1]) {
    return ipv4MappedMatch[1];
  }

  const lowercase = normalized.toLowerCase();
  if (lowercase === '::' || lowercase === EXPANDED_IPV6_UNSPECIFIED) {
    return '127.0.0.1';
  }

  if (lowercase === EXPANDED_IPV6_LOOPBACK) {
    return '::1';
  }

  const ipv4WithPortMatch = normalized.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  return ipv4WithPortMatch?.[1] ?? normalized;
}

function isPrivateOrLocalIp(ip: string) {
  const normalized = normalizeIpAddress(ip)?.toLowerCase() ?? '';

  if (
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized === 'localhost' ||
    normalized.startsWith('10.') ||
    normalized.startsWith('192.168.')
  ) {
    return true;
  }

  if (normalized.startsWith('172.')) {
    const secondOctet = Number(normalized.split('.')[1] ?? NaN);
    return (
      Number.isInteger(secondOctet) && secondOctet >= 16 && secondOctet <= 31
    );
  }

  return normalized.startsWith('fc') || normalized.startsWith('fd');
}

function buildLabel(input: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
}) {
  const parts = [input.city, input.region, input.country].filter(
    (part): part is string => Boolean(part?.trim()),
  );

  if (parts.length > 0) {
    return parts.join(', ');
  }

  return null;
}

function toResult(input: {
  label: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  countryCode?: string | null;
}): IpLocationResult {
  return {
    label: input.label ?? 'Unknown location',
    city: input.city ?? null,
    region: input.region ?? null,
    country: input.country ?? null,
    countryCode: input.countryCode ?? null,
  };
}

function getFallbackLocation(ip: string) {
  if (isPrivateOrLocalIp(ip)) {
    return toResult({
      label: 'Localhost / private network',
      city: 'Local network',
      region: null,
      country: null,
      countryCode: null,
    });
  }

  return toResult({
    label: `IP ${ip}`,
    city: null,
    region: null,
    country: null,
    countryCode: null,
  });
}

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: 'application/json',
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function resolveIpLocation(
  ip: string | null | undefined,
): Promise<IpLocationResult> {
  const normalizedIp = normalizeIpAddress(ip);

  if (!normalizedIp) {
    return toResult({
      label: 'Unknown location',
      city: null,
      region: null,
      country: null,
      countryCode: null,
    });
  }

  const cached = locationCache.get(normalizedIp);
  if (cached) {
    return cached;
  }

  if (isPrivateOrLocalIp(normalizedIp)) {
    const fallback = getFallbackLocation(normalizedIp);
    locationCache.set(normalizedIp, fallback);
    return fallback;
  }

  try {
    const response = await fetchWithTimeout(
      `https://ipwho.is/${encodeURIComponent(normalizedIp)}`,
      2500,
    );
    if (!response.ok) {
      const fallback = getFallbackLocation(normalizedIp);
      locationCache.set(normalizedIp, fallback);
      return fallback;
    }

    const payload = (await response.json()) as {
      success?: boolean;
      city?: string | null;
      region?: string | null;
      country?: string | null;
      country_code?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      message?: string;
    };

    if (!payload.success) {
      const fallback = getFallbackLocation(normalizedIp);
      locationCache.set(normalizedIp, fallback);
      return fallback;
    }

    const result = toResult({
      label: buildLabel({
        city: payload.city,
        region: payload.region,
        country: payload.country,
      }),
      city: payload.city ?? null,
      region: payload.region ?? null,
      country: payload.country ?? null,
      countryCode: payload.country_code ?? null,
    });
    locationCache.set(normalizedIp, result);
    return result;
  } catch {
    const fallback = getFallbackLocation(normalizedIp);
    locationCache.set(normalizedIp, fallback);
    return fallback;
  }
}
